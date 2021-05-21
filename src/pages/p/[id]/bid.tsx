import React, { useState, CSSProperties, useEffect } from 'react';
import { Grid, Select } from '@geist-ui/react';
import { useRouter } from 'next/router';
import {
  InputNumber,
  Spin,
  Button,
  Typography,
  message,
  notification,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { isEmpty } from 'lodash';
import { currentSupportedTokens as tokens } from '../../../constant/contracts';
// import { useMediaData } from '../../../hooks/useMediaData';
import { useMedia } from '../../../hooks/useMedia';
import { useERC20 } from '../../../hooks/useERC20';
import { constructBid } from '../../../utils/zdkUtils';
import { useWallet } from 'use-wallet';
import { BigNumber, utils } from 'ethers';
// import { useBalance } from '../../../hooks/useBalance';
import { useMediaToken } from '../../../hooks/useMediaToken';
import { useAllowance } from '../../../hooks/useAllowance';
import { useMarket } from '../../../hooks/useMarket';
import Link from 'next/link';
import { getDecimalOf, getSymbolOf } from '../../../utils/tokens';
import NFTPreview from '../../../components/NFTPreview/index';
import { getMediaById, getMediaMetadata } from '../../../backend/media';
import { ZERO_ADDRESS } from '../../../constant';
import { useMyBid } from '../../../hooks/useMyBid';
import { useBoolean } from 'ahooks';
import { WETHHelpTip } from '../../../components/Bid/WethHelpTip';

const { Paragraph, Title } = Typography;

export default function BidPage() {
  const router = useRouter();
  const wallet = useWallet();
  const { id } = router.query;
  const mediaContract = useMedia();
  const marketContract = useMarket();
  const handler = (val: string | string[]) => {
    setCurrency(val as string);
  };
  const { profile, isMeTheOwner, isAskExist } = useMediaToken(Number(id));
  const [currency, setCurrency] = useState<string>('');
  const [amount, setAmount] = useState('0');
  const [sellOnShare, setSellOnShare] = useState(0);
  const { myBid, removeBid } = useMyBid(id as string);
  const {
    token: tokenContrct,
    isProfileLoading,
    tokenProfile,
    formattedBalance,
  } = useERC20(currency);
  // `transferFrom` happened at Market, so just approve Market
  const { isEnough, approve, isUnlocking } = useAllowance(
    tokenContrct,
    marketContract.address
  );
  const [mediaData, setMediaData] = useState<{ [key: string]: any }>({
    media: {
      tokenURI: '',
    },
    metadata: {
      mimeType: '',
    },
  });

  const openNotification = ({
    description,
    duration = 4.5,
    key = '',
  }: {
    description: string;
    duration?: number | null;
    key?: string;
  }) => {
    notification.open({
      message: 'Notification Title',
      description: description,
      duration: duration,
      key: key,
    });
  };

  const [isSigning, signingActions] = useBoolean(false);
  async function setBid() {
    if (!wallet.account) {
      message.warning('Wallet have to be connected');
      return;
    }
    const bidData = constructBid(
      currency,
      amount,
      wallet.account,
      wallet.account,
      sellOnShare
    );
    console.info('bidData', bidData);
    try {
      signingActions.setTrue();
      const tx = await mediaContract.setBid(id as string, bidData);

      const keyOne = `open${Date.now()}`;
      openNotification({
        description:
          'Setting bids... Wait for the contract confirmation, please do not refresh or leave the page.',
        duration: null,
        key: keyOne,
      });

      const receipt = await tx.wait();

      notification.close(keyOne);
      openNotification({
        description: `Successful bid.${
          receipt.transactionHash
            ? 'transactionHash:' + receipt.transactionHash
            : ''
        }`,
      });
    } catch (error) {
      mediaContract.callStatic
        .setBid(id as string, bidData)
        .catch(callError => {
          console.error('callError', callError);
          console.error('reason', callError.reason);
          message.info('Error happened: ' + callError.reason);
        });
    } finally {
      signingActions.setFalse();
    }
  }
  // get media
  const getMediaByIdFn = async (id: string) => {
    try {
      const mediaRes = await getMediaById(id);
      let metadataRes;
      if (!isEmpty(mediaRes)) {
        metadataRes = await getMediaMetadata(mediaRes.metadataURI);
      }
      console.log('mediaRes', mediaRes);
      setMediaData({
        media: mediaRes,
        metadata: metadataRes,
      });
    } catch (e) {
      console.log('e', e);
    }
  };

  useEffect(() => {
    id && getMediaByIdFn(String(id));
  }, [id]);

  if (!id) {
    return (
      <StyledPermissions>
        <Spin tip='Fetching Param `ID` now... Please wait'></Spin>
      </StyledPermissions>
    );
  }
  if (isMeTheOwner) {
    return (
      <StyledPermissions>
        <Title level={3}>Sorry, but...</Title>
        <Paragraph>
          We detected that you are the owner. Which in this case that you cannot
          set a bid on your token.
        </Paragraph>
        <ActionsBox>
          <StyledBackBtn
            icon={<ArrowLeftOutlined />}
            onClick={() => router.back()}>
            Go Back
          </StyledBackBtn>
          <Link href={`/p/${id}/ask`}>
            <Button>Set Ask instead</Button>
          </Link>
        </ActionsBox>
      </StyledPermissions>
    );
  }
  return (
    <StyledWrapper justify='center'>
      <Grid
        xs={24}
        md={12}
        style={{ background: '#f2f2f2', padding: 50 }}
        justify='center'
        alignItems='center'>
        <NFTPreview
          src={mediaData?.media.tokenURI}
          type={
            mediaData?.metadata.mimeType
              ? mediaData.metadata.mimeType.split('/')[0]
              : ''
          }></NFTPreview>
      </Grid>
      <Grid xs={24} md={12}>
        <BiddingBox>
          <GreyCard>
            <p className='title'>CREATOR EQUITY</p>
            <p className='value'>
              {utils.formatUnits(profile.bidsShares.creator.value, 18)}%
            </p>
          </GreyCard>

          {isAskExist && (
            <GreyCard>
              <p className='title'>CURRENT ASK</p>
              <p className='value'>
                {utils.formatUnits(
                  profile.currentAsk.amount,
                  getDecimalOf(profile.currentAsk.currency)
                )}
                {' ' + getSymbolOf(profile.currentAsk.currency)}
              </p>
            </GreyCard>
          )}

          {myBid && myBid.currency !== ZERO_ADDRESS && (
            <GreyCard>
              <p className='title'>MY CURRENT BID</p>
              <p className='value'>
                {utils.formatUnits(myBid.amount, getDecimalOf(myBid.currency))}
                {' ' + getSymbolOf(myBid.currency)}
              </p>
              <Paragraph>
                You will get the refund of the previous bid, if you put on a new
                bid now.
              </Paragraph>
              <Button onClick={() => removeBid()}>Remove Current Bid</Button>
            </GreyCard>
          )}

          <StyledBidsItem>
            <Title level={3}>Your bid</Title>
            <StyledBidsInput>
              <Select
                placeholder='Bidding Currency'
                onChange={handler}
                width='100%'
                className='select-token'>
                {Object.keys(tokens!).map(symbol => (
                  <Select.Option value={tokens![symbol]} key={symbol}>
                    {symbol}
                  </Select.Option>
                ))}
              </Select>
              <InputNumber<string>
                placeholder='0.00'
                className='input-token'
                value={amount}
                onChange={setAmount}
                style={FullWidth}
                formatter={value =>
                  utils.formatUnits(value as string, tokenProfile.decimals)
                }
                parser={value =>
                  utils
                    .parseUnits(value as string, tokenProfile.decimals)
                    .toString()
                }
                stringMode
                min='0'
              />
            </StyledBidsInput>
            {currency && <p className='balance'>Balance: {formattedBalance}</p>}
            {/* 
              { 
                currency && currentWETH === utils.getAddress(currency) && balance.lt(amount) &&
                <GreyCard>
                  <Text>WETH (Wrapped ETH) selected, You may need to upgrade your ETH to WETH in order to set bid</Text>
                  <Text>Balance: {utils.formatEther(ethBalance)} ETH (Good to upgrade to WETH)</Text>
                  <Button type="secondary" onClick={() => depositToWETH(amount)}>Upgrade for {utils.formatEther(amount)} WETH</Button>
                  <Button type="secondary" onClick={() => depositToWETH(BigNumber.from(amount).sub(balance))}>Upgrade for {utils.formatEther(BigNumber.from(amount).sub(balance))} WETH to add up the price</Button>
                  { balance.gt(0) && <Button type='error' onClick={() => withdrawBacktoETH(balance)}>Downgrade All WETH back to ETH</Button> }
                </GreyCard>
              } */}
            <WETHHelpTip
              currency={currency}
              bidPrice={amount}
              wethBalance={tokenProfile.balance}
            />
          </StyledBidsItem>

          <StyledBidsItem>
            <Title level={3}>Resale Fee</Title>
            <Paragraph>
              If you re-sell this piece, the person you&apos;re buying it from
              now will earn this percentage as a reward for selling it to you.
            </Paragraph>
            <InputNumber
              defaultValue={0}
              style={FullWidth}
              onChange={setSellOnShare}
              min={0}
              precision={0}
              max={99}
            />
          </StyledBidsItem>

          <ActionsBox>
            <StyledBackBtn
              icon={<ArrowLeftOutlined />}
              onClick={() => router.back()}></StyledBackBtn>
            {wallet.status === 'connected' ? (
              isEnough(amount) ? (
                <Button
                  style={FullWidth}
                  disabled={currency === '' || BigNumber.from(amount).lte(0)}
                  loading={isSigning}
                  onClick={() => setBid()}>
                  Make your bid
                </Button>
              ) : (
                <Button
                  loading={isUnlocking}
                  style={FullWidth}
                  onClick={() => approve()}>
                  Unlock
                </Button>
              )
            ) : (
              <Button
                style={FullWidth}
                onClick={() => wallet.connect('injected')}>
                Connect Wallet
              </Button>
            )}
          </ActionsBox>
        </BiddingBox>
      </Grid>
    </StyledWrapper>
  );
}
const StyledWrapper = styled(Grid.Container)`
  flex: 1;
`;

const StyledPermissions = styled.div`
  flex: 1;
  text-align: center;
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 100px 0 0;
`;

const BiddingBox = styled.div`
  max-width: 470px;
  margin: auto;
`;

const GreyCard = styled.div`
  box-sizing: border-box;
  margin: 0;
  min-width: 0;
  padding: 20px 20px;
  width: 100%;
  flex-direction: column;
  border-radius: 4px;
  border: 2px solid #f2f2f2;
  background-color: #f2f2f2;
  margin-bottom: 10px;
  display: flex;
  .title {
    color: rgb(136, 136, 136);
    padding: 0;
    margin: 0;
    font-size: 14px;
  }
  .value {
    font-weight: bold;
    font-size: 16px;
    padding: 0;
    margin: 10px 0 0 0;
  }
`;

const ActionsBox = styled.div`
  display: flex;
  margin: 20px 0;
`;

const FullWidth: CSSProperties = {
  width: '100%',
};

const StyledBidsItem = styled.div`
  margin: 20px 0;
  .balance {
    font-size: 14px;
    margin: 6px 0 0 0;
    padding: 0;
    color: #333;
  }
`;

const StyledBidsInput = styled.div`
  display: flex;
  .select-token {
    margin-right: 5px;
  }
  .input-token {
    margin-left: 5px;
  }
`;

const StyledBackBtn = styled(Button)`
  margin-right: 10px;
  min-width: 80px;
`;
