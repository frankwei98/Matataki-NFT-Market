import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import {
  Tag,
  Form,
  Modal,
  Image,
  Upload,
  Avatar,
  Button,
  message,
  List,
  Spin,
  Input,
} from 'antd';
import { UserOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { isEmpty } from 'lodash';
import { ReactSVG } from 'react-svg';
import { UserInfoState } from '../../store/userInfoSlice';
import { useAppSelector } from '../../hooks/redux';
import { NFTProps } from '../../../next-env';
import NFTSimple from '../../components/NFTSimple';
import { CopyToClipboard } from 'react-copy-to-clipboard';

import { useLogin } from '../../hooks/useLogin';
import { getUser, getUserTags } from '../../backend/user';
import {
  backendSWRFetcher,
  getMediaById,
  getMediaMetadata,
} from '../../backend/media';
import { User } from '../../types/User.types';
import { BidLog } from '../../types/Bid';
import ArtworksCarousel from '../../components/ArtworksCarouselUser';

import IconTelegram from '../../assets/icons/telegram.svg';
import IconEmail from '../../assets/icons/email1.svg';
import IconMedium from '../../assets/icons/medium.svg';
import IconTwitter from '../../assets/icons/twitter.svg';
import IconDiscord from '../../assets/icons/discord.svg';
import IconFacebook from '../../assets/icons/facebook.svg';
import useSWR from 'swr';
import GalleryCard from '../../components/GalleryCard';
import { Gallery } from '../../types/Gallery';
import { UploadProps } from 'antd/lib/upload/interface';
import { storageUploadFile } from '../../backend/storage';
import { updateGallery } from '../../backend/gallery';

interface Props {
  setIsProfile: (value: boolean) => void;
}

const UserInfoPage: React.FC<Props> = ({ setIsProfile }) => {
  const router = useRouter();
  const [galleryForm] = Form.useForm();
  const { username } = router.query;
  const [userInfo, setUserInfo] = useState<User | any>({
    avatar: '',
    nickname: '',
    username: '',
    telegram: '',
    twitter: '',
    email: '',
    medium: '',
    facebook: '',
  });
  const [isVerifiedUser, setIsVerifiedUser] = useState(false);
  const [isMyself, setIsMyself] = useState(false);
  const [editingGalleryId, setEditingGalleryId] = useState<number>(0);
  const appUserInfo = useAppSelector(state => state.userInfo);
  const [nftListData, setNFTListData] = useState<Array<NFTProps>>([]);
  const [switchFeedOrBids, setSwitchFeedOrBids] = useState<'feed' | 'bids'>(
    'feed'
  );
  const [bidsList, setBidsList] = useState<Array<BidLog>>([]);
  const { userDataByWallet } = useLogin();
  // show bid cancel modal
  const [
    isModalVisibleBidsCancel,
    setIsModalVisibleBidsCancel,
  ] = useState<boolean>(false);

  const [
    isModalVisibleEditGallery,
    setIsModalVisibleEditGallery,
  ] = useState<boolean>(false);

  // click bid idx
  const [currentBidsIdx, setCurrentBidsIdx] = useState<number>(0);
  const [coverUrl, setCoverUrl] = useState<string>('');

  const keyMessage = 'fetchUser';

  const { data: contractedArtists, error: artistsError } = useSWR<User[], any>(
    userDataByWallet ? `/user/${userDataByWallet.id}/owned-artists` : null,
    backendSWRFetcher
  );

  const { data: galleryOwner, error: galleryError } = useSWR<User, any>(
    username ? `/user/@${username}/ownedGalleries` : null,
    backendSWRFetcher
  );

  const [tagsList, setTagsList] = useState<Array<string>>([]);

  // 获取用户信息
  useEffect(() => {
    const fetchUserInfoData = async () => {
      if (typeof username !== 'string') return;
      try {
        const userInfo = await getUser(username as string);
        console.log('userInfo', userInfo);
        if (userDataByWallet && userDataByWallet.username === username) {
          setIsMyself(true);
        }
        setUserInfo(userInfo);
        setIsVerifiedUser(false);
        return userInfo;
      } catch (e) {
        let err = e.toString();
        console.log('e', e.toString());

        if (err.includes('status code 404')) {
          message.destroy(keyMessage);
          message.error({ content: 'No such user！', key: keyMessage });
          router.push('/');
        }

        setIsVerifiedUser(false);
        return;
      }
    };
    // 获取NFT信息
    const fetchNFTListData = async (userInfo: User) => {
      const uniNftId = new Set<number>();
      if (userInfo.createdMedia) {
        userInfo.createdMedia.map((item: any) => uniNftId.add(item));
      }
      if (userInfo.ownedMedia) {
        userInfo.ownedMedia.map(item => uniNftId.add(item));
      }
      const getUserMediaList = Array.from(uniNftId).map(async id => {
        const media = await getMediaById(id);
        return media;
      });
      const userMediaList = await Promise.all(getUserMediaList);
      const getUserNftList: Promise<NFTProps>[] = userMediaList.map(
        async media => {
          const metadata = await getMediaMetadata(media.metadataURI);
          return {
            id: media.id,
            type: metadata.mimeType.split('/')[0],
            title: metadata.name,
            description: metadata.description,
            fields: {
              low: { stringValue: media.tokenURI },
              stream: { stringValue: media.tokenURI },
              medium: { stringValue: media.tokenURI },
              high: { stringValue: media.tokenURI },
              thumbnail: { stringValue: media.tokenURI },
            },
            content: {
              low: media.tokenURI,
              stream: media.tokenURI,
              medium: media.tokenURI,
              high: media.tokenURI,
              thumbnail: media.tokenURI,
            },
            owner: media.owner,
            creator: media.creator,
            tags: media.tags,
          };
        }
      );
      const userNftList = await Promise.all(getUserNftList);
      setNFTListData(userNftList || []);
    };

    const fetchAll = async () => {
      const userInfo = await fetchUserInfoData();
      if (!isEmpty(userInfo)) {
        await fetchNFTListData(userInfo!);
      }
    };

    fetchAll();
  }, [appUserInfo, userDataByWallet, username, router]);
  // 获取用户tags
  useEffect(() => {
    const fetch = async () => {
      if (typeof username !== 'string') return;
      const data = await getUserTags(username);
      console.log('getUserTags', data);
      const list = data.tags.map(i => i.name);
      setTagsList(list);
    };
    fetch();
  }, [userInfo, username]);

  const IconList = useMemo(() => {
    let list = [
      {
        name: userInfo?.telegram,
        icon: IconTelegram,
      },
      {
        name: userInfo?.twitter,
        icon: IconTwitter,
      },
      {
        name: userInfo?.email,
        icon: IconEmail,
      },
      {
        name: userInfo?.medium,
        icon: IconMedium,
      },
      {
        name: userInfo?.facebook,
        icon: IconFacebook,
      },
    ];
    return list;
  }, [userInfo]);

  const userAboutIconList = useMemo(() => {
    return [
      {
        name: userInfo?.about?.telegram,
        icon: IconTelegram,
      },
      {
        name: userInfo?.about?.twitter,
        icon: IconTwitter,
      },
      {
        name: userInfo?.about?.medium,
        icon: IconMedium,
      },
      {
        name: userInfo?.about?.facebook,
        icon: IconFacebook,
      },
      {
        name: userInfo?.about?.discord,
        icon: IconDiscord,
      },
      {
        name: userInfo?.about?.email,
        icon: IconEmail,
      },
    ];
  }, [userInfo]);

  const collectionContainer = () => {
    return (
      <>
        <StyledTitle>Collection</StyledTitle>
        <StyledMediaCardContainer>
          {nftListData.map((item, index) => (
            <Link href={`/p/${item.id}`} key={`media-card-${index}`}>
              <a target='_blank'>
                <NFTSimple {...item} />
              </a>
            </Link>
          ))}
        </StyledMediaCardContainer>
      </>
    );
  };
  const ArtworksContainer = () => {
    return (
      <>
        {userInfo?.presentations ? (
          <>
            <StyledItem>
              <StyledItemTitle>Presentation</StyledItemTitle>
              {/* <StyledVideo>
                  <video
                    src={
                      'https://ipfs.fleek.co/ipfs/QmUDqKPSgRaGNjjDnJ89wWecpFzMGaiPcHZ76FsuepAD5Y'
                    }
                    loop
                    playsInline
                    // autoPlay
                    // poster={'https://placeimg.com/1440/810/nature?t=1617247698083'}
                    className='media-video'
                  />
                </StyledVideo> */}
              <StyledPresentation>
                <Image
                  src={
                    userInfo?.presentations ? userInfo?.presentations[0] : ''
                  }></Image>
              </StyledPresentation>
            </StyledItem>
            <StyledLine />
          </>
        ) : null}

        {!isEmpty(nftListData) ? (
          <>
            <StyledItem>
              <StyledItemTitle>NFTs</StyledItemTitle>
              <StyledMediaCardContainer>
                {nftListData.map((item, index) => (
                  <Link href={`/p/${item.id}`} key={`media-card-${index}`}>
                    <a target='_blank'>
                      <NFTSimple {...item} />
                    </a>
                  </Link>
                ))}
              </StyledMediaCardContainer>
            </StyledItem>
            <StyledLine />
          </>
        ) : null}

        {!isEmpty(userInfo?.artworks) ? (
          <>
            <StyledItem>
              <StyledItemTitle>Artworks</StyledItemTitle>
              <StyledArtworks>
                <ArtworksCarousel data={userInfo?.artworks} />
              </StyledArtworks>
            </StyledItem>
            <StyledLine />
          </>
        ) : null}

        <StyledItem>
          <StyledItemTitle>About</StyledItemTitle>
          <StyledAbout>
            <div className='item'>
              <p className='text'>{userInfo?.about.description}</p>
            </div>
            <div className='item'>
              <div className='cover'>
                {userInfo?.about.banner ? (
                  <img
                    src={userInfo?.about.banner}
                    alt={userInfo?.about.bannerDescription}
                  />
                ) : null}
              </div>
              <p className='gallery-name'>
                {userInfo?.about.bannerDescription}
              </p>
              {userAboutIconList.map((i: any) =>
                i.name ? (
                  <StyledAboutItem>
                    <ReactSVG className='icon' src={i.icon} />
                    <span>{i.name}</span>
                  </StyledAboutItem>
                ) : null
              )}
            </div>
          </StyledAbout>
        </StyledItem>
      </>
    );
  };

  const onEditingGallery = (gallery: Gallery) => {
    setEditingGalleryId(gallery.id);

    if (galleryOwner?.ownedGalleries?.length) {
      galleryForm.setFieldsValue({
        name: gallery?.name,
        intro: gallery?.intro,
        presentations: gallery?.presentations,

        aboutDescription: gallery?.about.description,
        aboutBanner: gallery?.about.banner,
        aboutBannerDescription: gallery?.about.bannerDescription,
        aboutTelegram: gallery?.about.telegram,
        aboutTwitter: gallery?.about.twitter,
        aboutMedium: gallery?.about.medium,
        aboutFacebook: gallery?.about.facebook,
        aboutDiscord: gallery?.about.discord,
        aboutEmail: gallery?.about.email,
      });

      setCoverUrl(gallery?.cover || '');
    }

    setIsModalVisibleEditGallery(true);
  };

  const editGalleryDone = () => {
    setIsModalVisibleEditGallery(false);
  };

  const editGalleryCancelled = () => {
    setIsModalVisibleEditGallery(false);
  };

  const editGalleryFinish = async (values: any) => {
    console.log('Success:', values);

    values.cover = coverUrl;

    if (values.presentations) {
      values.presentations = [values.presentations];
    }
    let artworksList = [
      values.artworks1,
      values.artworks2,
      values.artworks3,
      values.artworks4,
      values.artworks5,
    ];
    let artworksListFilter = artworksList.filter(i => !isEmpty(i));
    if (!isEmpty(artworksListFilter)) {
      values.artworks = artworksListFilter;
    }

    values.about = {
      description: values.aboutDescription,
      banner: values.aboutBanner,
      bannerDescription: values.aboutBannerDescription,
      telegram: values.aboutTelegram,
      twitter: values.aboutTwitter,
      medium: values.aboutMedium,
      facebook: values.aboutFacebook,
      discord: values.aboutDiscord,
      email: values.aboutEmail,
    };

    try {
      const res = await updateGallery(editingGalleryId, values);
      console.log('res', res);
      if (res.code === 200) {
        message.success('更新成功');
      } else {
        throw new Error('更新失败');
      }
    } catch (e) {
      message.error(e.toString());
    }
  };

  const onFinishFailed = (errorInfo: any) => {
    console.log('Failed:', errorInfo);
  };

  const onChangeCover = (info: any) => {
    console.log('info', info);
    if (info.file.status !== 'uploading') {
      console.log(info.file, info.fileList);
    }
    if (info.file.status === 'done') {
      message.success(`${info.file.name} file uploaded successfully`);
      const { url } = info.file.response.data;
      setCoverUrl(url);
    } else if (info.file.status === 'error') {
      message.error(`${info.file.name} file upload failed.`);
    }
  };

  const props: UploadProps = {
    accept: 'image/jpeg, image/png',
    name: 'file',
    action: storageUploadFile,
    method: 'PUT',
    maxCount: 1,
    beforeUpload(file: File) {
      message.info('Uploading...');
      const isJpgOrPng =
        file.type === 'image/jpeg' || file.type === 'image/png';
      if (!isJpgOrPng) {
        message.error('You can only upload JPG/PNG file!');
      }
      return isJpgOrPng;
    },
  };

  // useEffect(() => {
  //   galleryOwner?.ownedGalleries.push(galleryOwner?.ownedGalleries[0]);
  //   galleryOwner?.ownedGalleries.push(galleryOwner?.ownedGalleries[0]);
  // }, [galleryOwner]);

  const galleryContainer = () => {
    return (
      <>
        <StyledItem>
          <StyledItemTitle>Manage My Gallery</StyledItemTitle>
          <StyledGallery>
            {galleryOwner?.ownedGalleries.map(
              (gallery: Gallery, index: number) => (
                <GalleryCard {...gallery} key={index}>
                  <Button onClick={() => onEditingGallery(gallery)}>
                    Edit Information
                  </Button>
                </GalleryCard>
              )
            )}
          </StyledGallery>
        </StyledItem>
        <StyledLine />

        <StyledItem>
          <StyledItemTitle>Contracted Artists</StyledItemTitle>
          <StyledWord>
            <List
              dataSource={contractedArtists}
              renderItem={artist => (
                <List.Item>
                  <Link href={`/${artist.username}`}>
                    <a>
                      {artist.username}({artist.nickname})
                    </a>
                  </Link>
                </List.Item>
              )}
            />
          </StyledWord>
        </StyledItem>
        <StyledLine />

        <Modal
          title='Edit Gallery Information'
          visible={isModalVisibleEditGallery}
          forceRender={true}
          onOk={editGalleryDone}
          onCancel={editGalleryCancelled}
          footer={[
            <Button key='cancel' onClick={editGalleryCancelled}>
              Cancel
            </Button>,
            <Button
              type='primary'
              form='galleryForm'
              key='submit'
              htmlType='submit'
              onClick={editGalleryDone}>
              Submit
            </Button>,
          ]}>
          <StyledTitle style={{ fontSize: '30px', margin: '0px' }}>
            Gallery Cover
          </StyledTitle>
          <StyledHelper>Click to upload a new one</StyledHelper>
          <Upload onChange={onChangeCover} {...props} className='upload'>
            <img
              width={140}
              height={140}
              style={{ objectFit: 'cover' }}
              src={coverUrl}></img>
          </Upload>
          <StyledForm
            form={galleryForm}
            id='galleryForm'
            name='galleryForm'
            layout='vertical'
            onFinish={editGalleryFinish}
            onFinishFailed={onFinishFailed}>
            <Form.Item label='Title' name='name' rules={[{ required: true }]}>
              <Input placeholder='The Gallery title' autoComplete='off' />
            </Form.Item>
            <Form.Item
              label='Introduction'
              name='intro'
              rules={[{ required: true }]}>
              <Input
                placeholder='The Gallery introduction'
                autoComplete='off'
              />
            </Form.Item>
            <Form.Item
              label='Presentations'
              name='presentations'
              rules={[{ required: false }]}>
              <Input placeholder='Enter presentations' autoComplete='off' />
            </Form.Item>
            <Form.Item
              label='Artworks'
              name='artworks1'
              rules={[{ required: false }]}>
              <Input placeholder='Enter artworks' autoComplete='off' />
            </Form.Item>
            <Form.Item
              label='Artworks'
              name='artworks2'
              rules={[{ required: false }]}>
              <Input placeholder='Enter artworks' autoComplete='off' />
            </Form.Item>
            <Form.Item
              label='Artworks'
              name='artworks3'
              rules={[{ required: false }]}>
              <Input placeholder='Enter artworks' autoComplete='off' />
            </Form.Item>
            <Form.Item
              label='Artworks'
              name='artworks4'
              rules={[{ required: false }]}>
              <Input placeholder='Enter artworks' autoComplete='off' />
            </Form.Item>
            <Form.Item
              label='Artworks'
              name='artworks5'
              rules={[{ required: false }]}>
              <Input placeholder='Enter artworks' autoComplete='off' />
            </Form.Item>
            <Form.Item
              label='aboutDescription'
              name='aboutDescription'
              rules={[{ required: false }]}>
              <Input.TextArea
                rows={6}
                placeholder='Enter aboutDescription'
                autoComplete='off'
              />
            </Form.Item>
            <Form.Item
              label='aboutBanner'
              name='aboutBanner'
              rules={[{ required: false }]}>
              <Input placeholder='Enter aboutBanner' autoComplete='off' />
            </Form.Item>
            <Form.Item
              label='aboutBannerDescription'
              name='aboutBannerDescription'
              rules={[{ required: false }]}>
              <Input
                placeholder='Enter aboutBannerDescription'
                autoComplete='off'
              />
            </Form.Item>
            <Form.Item
              label='aboutEmail'
              name='aboutEmail'
              rules={[{ required: false, type: 'email' }]}>
              <Input placeholder='Enter aboutEmail' autoComplete='off' />
            </Form.Item>
            <Form.Item
              label='aboutTelegram'
              name='aboutTelegram'
              rules={[{ required: false }]}>
              <Input placeholder='Enter aboutTelegram' autoComplete='off' />
            </Form.Item>
            <Form.Item
              label='aboutTwitter'
              name='aboutTwitter'
              rules={[{ required: false }]}>
              <Input placeholder='Enter aboutTwitter' autoComplete='off' />
            </Form.Item>
            <Form.Item
              label='aboutMedium'
              name='aboutMedium'
              rules={[{ required: false }]}>
              <Input placeholder='Enter aboutMedium' autoComplete='off' />
            </Form.Item>
            <Form.Item
              label='aboutFacebook'
              name='aboutFacebook'
              rules={[{ required: false }]}>
              <Input placeholder='Enter aboutFacebook' autoComplete='off' />
            </Form.Item>
            <Form.Item
              label='aboutDiscord'
              name='aboutDiscord'
              rules={[{ required: false }]}>
              <Input placeholder='Enter aboutDiscord' autoComplete='off' />
            </Form.Item>
          </StyledForm>
        </Modal>
      </>
    );
  };
  return (
    <StyledWrapper>
      <StyledHead>
        <StyledHeadUser>
          <Avatar icon={<UserOutlined />} src={userInfo.avatar} size={66} />
          <StyledHeadUserInfo>
            {userInfo.nickname || userInfo.username ? (
              <>
                <h1>
                  {userInfo.nickname}({userInfo.username})
                </h1>
                <p>{userInfo.bio || 'Not...'}</p>
              </>
            ) : null}
          </StyledHeadUserInfo>
        </StyledHeadUser>
        <StyledHeadRight>
          <StyledHeadIcon>
            {IconList.map((i: any, idx: number) =>
              i.name ? (
                <CopyToClipboard
                  key={idx}
                  text={i.name}
                  onCopy={() => message.info('复制成功！')}>
                  {i.name ? <ReactSVG className='icon' src={i.icon} /> : null}
                </CopyToClipboard>
              ) : null
            )}
          </StyledHeadIcon>
          {tagsList.length ? (
            <StyledHeadTags>
              {tagsList.map((i, idx) => (
                <Tag key={idx}>{i}</Tag>
              ))}
            </StyledHeadTags>
          ) : null}
          {isMyself ? (
            <StyledHeadEdit>
              <Button
                onClick={() => router.push(`/${username}/edit`)}
                size='small'>
                EDIT PROFILE
              </Button>
            </StyledHeadEdit>
          ) : null}
        </StyledHeadRight>
      </StyledHead>
      <StyledLine />
      {!isEmpty(galleryOwner?.ownedGalleries) && galleryContainer()}
      {userInfo?.role === 'COLLECTOR' ? (
        collectionContainer()
      ) : userInfo?.role === 'ARTIST' ? (
        ArtworksContainer()
      ) : userInfo?.role === 'SUPER_ADMIN' ? (
        collectionContainer()
      ) : (
        <StyledWrapperLoading>
          <Spin tip={'Loading...'} />
        </StyledWrapperLoading>
      )}
    </StyledWrapper>
  );
};

const StyledWrapperLoading = styled.div`
  text-align: center;
  margin: 100px 0 0;
`;

const StyledWrapper = styled.div`
  flex: 1;

  max-width: 1480px;
  padding: 0 20px 256px;
  box-sizing: border-box;

  margin: 0 auto;
  width: 100%;

  @media screen and (max-width: 768px) {
    padding-left: 10px;
    padding-right: 10px;
  }
`;
const StyledLine = styled.div`
  width: 100%;
  height: 1px;
  background: #dbdbdb;
`;
const StyledTitle = styled.div`
  font-size: 32px;
  font-family: 'Playfair Display', serif;
  font-weight: 500;
  color: #333333;
  line-height: 39px;
  padding: 0;
  margin: 24px 0 0 0;
`;
const StyledHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  padding: 48px 0;
`;
const StyledHeadUser = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  @media screen and (max-width: 678px) {
    justify-content: center;
    flex-direction: column;
    width: 100%;
  }
`;
const StyledHeadUserInfo = styled.div`
  margin: 0 0 0 15px;
  position: relative;
  top: 10px;
  @media screen and (max-width: 678px) {
    margin: 10px 0;
    top: 0;
    text-align: center;
  }

  h1 {
    font-size: 34px;
    font-weight: bold;
    color: #333333;
    line-height: 1;
    padding: 0;
    margin: 0;
    @media screen and (max-width: 678px) {
      font-size: 20px;
    }
  }

  p {
    font-size: 16px;
    font-weight: 400;
    color: #333333;
    line-height: 1.2;
    padding: 0;
    margin: 6px 0 0 0;
  }
`;
const StyledHeadRight = styled.div`
  @media screen and (max-width: 678px) {
    width: 100%;
  }
`;
const StyledHeadIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  @media screen and (max-width: 678px) {
    justify-content: center;
  }

  .icon {
    width: 32px;
    height: 32px;
    margin-left: 32px;
    cursor: pointer;

    &:nth-of-type(1) {
      margin-left: 0;
    }

    svg {
      font-size: 32px;
      color: #333333;
    }

    @media screen and (max-width: 678px) {
      margin: 0 10px;
      width: 16px;
      height: 16px;
      svg {
        font-size: 16px;
      }
    }
  }
`;
const StyledHeadTags = styled.div`
  max-width: 400px;
  text-align: right;
  margin: 6px 0;

  .ant-tag {
    margin: 4px 0 4px 8px;
  }

  @media screen and (max-width: 678px) {
    text-align: center;
    .ant-tag {
      margin: 4px;
    }
  }
`;
const StyledHeadEdit = styled.div`
  text-align: right;
  @media screen and (max-width: 678px) {
    text-align: center;
  }
`;

const StyledMediaCardContainer = styled.div`
  width: 100%;
  display: grid;
  justify-content: center;
  gap: 30px 20px;
  margin: 48px auto 0;
  min-height: 320px;
  grid-template-columns: repeat(4, minmax(0px, 330px));

  & > a {
    width: 100%;
  }

  @media screen and (max-width: 1366px) {
    grid-template-columns: repeat(3, minmax(0px, 330px));
  }
  @media screen and (max-width: 1140px) {
    grid-template-columns: repeat(2, minmax(0px, 330px));
  }
  @media screen and (max-width: 768px) {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
`;

// artist start
const StyledItemTitle = styled.h3`
  font-size: 32px;
  font-family: 'Playfair Display', serif;
  font-weight: 500;
  color: #333333;
  line-height: 1.2;
  padding: 0;
  margin: 0;
  @media screen and (max-width: 678px) {
    font-size: 20px;
  }
`;
const StyledItem = styled.div`
  margin: 24px 0 64px;
  @media screen and (max-width: 678px) {
    margin: 20px 0;
  }
`;
const StyledVideo = styled.div`
  margin: 64px 0 0;
  height: 810px;

  .media-video {
    width: 100%;
    height: 100%;
  }

  @media screen and (max-width: 678px) {
    margin: 20px 0 0;
    height: 240px;
  }
`;
const StyledPresentation = styled.div`
  margin: 64px 0 0;
  text-align: center;
  width: 100%;
  overflow: hidden;
  @media screen and (max-width: 678px) {
    margin: 20px 0 0;
  }
`;
const StyledArtworks = styled.div`
  margin-top: 64px;

  .ant-carousel .slick-prev,
  .ant-carousel .slick-next,
  .ant-carousel .slick-prev:hover,
  .ant-carousel .slick-next:hover {
    font-size: inherit;
    color: currentColor;
  }
`;

const StyledAbout = styled.div`
  margin-top: 64px;
  display: flex;
  flex-wrap: wrap;
  @media screen and (max-width: 678px) {
    margin-top: 20px;
    flex-direction: column;
  }

  .item {
    flex: 1;

    &:nth-child(1) {
      margin-right: 24px;
    }

    &:nth-child(2) {
      margin-left: 24px;
    }

    @media screen and (max-width: 678px) {
      &:nth-child(1) {
        margin-right: 0;
      }

      &:nth-child(2) {
        margin-left: 0;
      }
    }
  }

  .text {
    font-size: 16px;
    font-family: 'Playfair Display', serif;
    font-weight: 500;
    color: #333333;
    padding: 0;
    margin: 40px 0 0 0;
    word-break: break-word;
    &:nth-child(1) {
      margin-top: 0;
    }
  }

  .cover {
    width: 100%;
    height: 392px;
    @media screen and (max-width: 678px) {
      height: 200px;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .gallery-name {
    font-size: 24px;
    font-family: 'Playfair Display', serif;
    font-weight: 500;
    color: #333333;
    line-height: 28px;
    padding: 0;
    margin: 24px 0 0 0;
  }
`;
const StyledAboutItem = styled.div`
  margin-top: 20px;
  display: flex;
  align-items: center;

  .icon {
    width: 20px;
    height: 20px;
    margin-left: 20px;
    cursor: pointer;

    &:nth-of-type(1) {
      margin-left: 0;
    }

    svg {
      font-size: 20px;
      color: #333333;
    }
  }

  span {
    font-size: 16px;
    font-weight: 400;
    color: #333333;
    line-height: 19px;
    margin-left: 6px;
  }
`;
// artist end

// gallery start
const StyledWord = styled.div`
  display: block;
  column-count: 4;
  margin-top: 16px;
  column-gap: 20px;
  @media screen and (max-width: 768px) {
    column-count: 2;
  }

  .item {
    /* 防止多列布局，分页媒体和多区域上下文中的意外中断 */
    break-inside: avoid;
    padding: 48px 0 0 0;
    list-style: none;

    li {
      margin: 9px 0;
      font-family: 'Playfair Display', serif;
      font-weight: 500;
      color: #333333;

      a {
        font-size: 16px;
        line-height: 19px;
        color: #333333;

        &:hover {
          text-decoration: underline;
        }
      }

      &:nth-child(1) {
        margin: 0;
      }

      &:nth-child(2) {
        margin-top: 16px;
      }

      h3 {
        font-size: 32px;
        line-height: 39px;
        padding: 0;
        margin: 0;
      }
    }
  }
`;

const StyledGallery = styled.div`
  width: 100%;
  display: grid;
  justify-content: center;
  grid-template-columns: repeat(4, minmax(0px, 1fr));
  gap: 48px 24px;
  margin: 48px auto 0;
  min-height: 320px;

  & > a {
    width: 100%;
  }

  @media screen and (max-width: 1366px) {
    grid-template-columns: repeat(3, minmax(0px, 1fr));
  }
  @media screen and (max-width: 1140px) {
    grid-template-columns: repeat(2, minmax(0px, 1fr));
  }
  @media screen and (max-width: 768px) {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .loading-container {
    margin-top: 20px;
    width: 100%;
    text-align: center;
  }
`;

const StyledForm = styled(Form)`
  margin-top: 40px;
  .ant-form-item {
    margin-bottom: 40px;
    border-bottom: 1px solid #d9d9d9;
    .ant-input,
    .ant-input-affix-wrapper {
      border: none;
    }
    .ant-input:focus,
    .ant-input-focused,
    .ant-input-affix-wrapper:focus,
    .ant-input-affix-wrapper-focused {
      box-shadow: none;
    }
  }
  .not-border.ant-form-item {
    border: none;
  }
`;

const StyledHelper = styled.p`
  font-size: 14px;
  font-weight: 300;
  color: #777777;
  line-height: 20px;
  margin: 4px 0 10px;
`;

const StyledButton = styled(Button)`
  width: 100%;
  height: 60px;
  border: 2px solid #333333;
  font-size: 16px;
  font-weight: 500;
  color: #333333;
  line-height: 22px;
  margin-bottom: 16px;
  &.black {
    background: #333333;
    color: #ffffff;
    &:hover {
      color: #ffffff;
    }
  }
  &:hover {
    color: #333333;
    border-color: #333333;
  }
  &.ant-btn:hover,
  &.ant-btn:focus {
    border-color: #333333;
  }
`;
// gallery end
export default UserInfoPage;
