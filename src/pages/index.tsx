import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import { useMount } from 'ahooks';
import { Spin, message } from 'antd';
import InfiniteScroll from 'react-infinite-scroller';

// import Banner from '../components/Banner';
// import Creators from '../components/Creators';
// import About from '../components/About';
import NFT from '../components/NFT';
import { NFTProps } from '../../next-env';

import { PaginationResult } from '../types/PaginationResult';
import { Media, MediaMetadata } from '../types/Media.entity';
import { getMediaList, getMediaMetadata } from '../backend/media';

type PaginationMeta = PaginationResult['meta'];

type MediaWithMetadata = Media & {
  metadata: MediaMetadata;
};

// 作家列表
// const creatorsList = [
//   {
//     bc: 'https://placeimg.com/540/184/nature?t=1617247698083',
//     avatar: 'https://placeimg.com/200/200/people',
//     username: '@Skull Pedestal',
//   },
//   {
//     bc: 'https://placeimg.com/540/184/nature',
//     avatar: 'https://placeimg.com/200/200/people?t=1617247587231',
//     username: '@Skull Pedestal',
//   },
//   {
//     bc: 'https://placeimg.com/540/184/nature?t=1617247711431',
//     avatar: 'https://placeimg.com/200/200/people?t=1617247595366',
//     username: '@Skull Pedestal',
//   },
//   {
//     bc: 'https://placeimg.com/540/184/nature?t=1617247718870',
//     avatar: 'https://placeimg.com/200/200/people?t=1617247602577',
//     username: '@Skull Pedestal',
//   },
// ];

// 关于更多 NFT
// const AboutNFTList = [
//   {
//     img: 'https://placeimg.com/700/340/arch',
//     text: 'How to collect your favorite NFTs at NFT Market?',
//     link: 'https://matataki.io',
//   },
//   {
//     img: 'https://placeimg.com/700/340/arch?t=1617248569810',
//     text:
//       'Collecting NFTs is more easier then you think,it’s only 3 steps to collect them!',
//     link: 'https://matataki.io',
//   },
//   {
//     img: 'https://placeimg.com/700/340/arch?t=1617248576772',
//     text: 'NFTs, explained: what they are,why are some worth millions?',
//     link: 'https://matataki.io',
//   },
//   {
//     img: 'https://placeimg.com/700/340/arch?t=1617248585076',
//     text: 'How to make, buy and sell NFTs',
//     link: 'https://matataki.io',
//   },
// ];

const Home: React.FC<void> = () => {
  // 更多 NFT
  const [NFTList, setNFTList] = useState<Array<NFTProps>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    totalItems: 0,
    itemCount: 0,
    itemsPerPage: 0,
    totalPages: 0,
    currentPage: 0,
  });

  // 获取NFT数据
  const fetchNFTData1 = async () => {
    try {
      const mediaList = await getMediaList(page, 12);
      console.log('mediaList', mediaList);
      if (mediaList.items.length) {
        const getMediaWithMetaList = mediaList.items.map(async item => {
          const metadata = await getMediaMetadata(item.metadataURI);
          return {
            ...item,
            metadata,
          };
        });
        const mediaWithMetaList: MediaWithMetadata[] = await Promise.all(
          getMediaWithMetaList
        );
        const realNftList: NFTProps[] = mediaWithMetaList.map(media => {
          return {
            id: media.id,
            type: media.metadata.mimeType.split('/')[0],
            title: media.metadata.name,
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
          };
        });

        setNFTList(NFTList.concat(realNftList));
        setPaginationMeta(mediaList.meta);
      }
      let _page = page;
      setPage(++_page);
    } catch (e) {
      message.error(`数据获取失败${e.toString()}`);
    }
  };

  useMount(() => {});

  // 处理滚动Load
  const handleInfiniteOnLoad = async () => {
    setLoading(true);
    // 第一页不判断
    if (page !== 1 && paginationMeta.currentPage >= paginationMeta.totalPages) {
      setLoading(false);
      setHasMore(false);
      return;
    }
    await fetchNFTData1();
    setLoading(false);
  };

  return (
    <StyledWrapper>
      <StyledModule>
        {/* <StyledModuleHead>
          <StyledTitle>
            Upcoming NFTs<span>New</span>
          </StyledTitle>
          <span className='more'>VIEW MORE</span>
        </StyledModuleHead> */}
        <InfiniteScroll
          pageStart={0}
          loadMore={handleInfiniteOnLoad}
          hasMore={!loading && hasMore}>
          <StyledNfts>
            {NFTList.map((i, idx) => (
              <Link href={`/p/${i.id}`} key={idx}>
                <a target='_blank'>
                  <NFT {...i}></NFT>
                </a>
              </Link>
            ))}
            {loading && hasMore && (
              <div className='loading-container'>
                <Spin />
              </div>
            )}
          </StyledNfts>
        </InfiniteScroll>
      </StyledModule>

      {/* <StyledModule className='creators'>
        <StyledModuleHead>
          <StyledTitle>
            Top NFT Creators<span>Hot</span>
          </StyledTitle>
          <span className='more'>VIEW MORE</span>
        </StyledModuleHead>
        <StyledCreators>
          {creatorsList.map((i, idx) => (
            <Creators
              key={idx}
              bc={i.bc}
              avatar={i.avatar}
              username={i.username}></Creators>
          ))}
        </StyledCreators>
      </StyledModule>

      <StyledModule className='about'>
        <StyledModuleHead>
          <StyledTitle>
            Learn More about NFT Market<span>Fun</span>
          </StyledTitle>
          <span className='more'>VIEW MORE</span>
        </StyledModuleHead>
        <StyledAbout>
          {AboutNFTList.map((i, idx) => (
            <div key={idx} className='box'>
              <About img={i.img} text={i.text} link={i.link}></About>
            </div>
          ))}
        </StyledAbout>
      </StyledModule> */}
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  flex: 1;

  /* max-width: 1480px; */
  /* padding: 0 20px 200px; */
  box-sizing: border-box;

  padding: 0 30px 200px;
  margin: 0px auto;
  width: 100%;

  @media screen and (max-width: 768px) {
    padding-left: 10px;
    padding-right: 10px;
  }
`;

const StyledTitle = styled.h3`
  font-size: 32px;
  font-family: BigCaslon-Medium, BigCaslon;
  font-weight: 500;
  color: #333333;
  line-height: 39px;
  padding: 0;
  margin: 0;
  position: relative;
  span {
    position: absolute;
    top: -10px;
    font-size: 24px;
    font-family: Playlist-Script, Playlist, 'Dancing Script', cursive;
    font-weight: normal;
    color: #f4cf1f;
    line-height: 37px;
  }
`;

const StyledModule = styled.h3`
  .empty {
    height: 800px;
    background-color: #f1f1f1;
  }

  &.nfts {
    /* margin-top: 46px; */
  }
  &.creators {
    margin-top: 100px;
  }
  &.about {
    margin-top: 100px;
  }
`;

const StyledModuleHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  margin: 20px 0;
  .more {
    font-size: 16px;
    font-family: PingFangSC-Medium, PingFang SC;
    font-weight: 500;
    color: #333333;
    line-height: 22px;
  }
`;
const StyledAbout = styled.div`
  display: grid;
  grid: repeat(2, 1fr) / repeat(4, 1fr);
  grid-row-gap: 22px;
  grid-column-gap: 24px;
  margin-top: 48px;
  .box {
    width: 100%;
    height: 100%;
    /* background: red; */
    &:nth-of-type(1) {
      grid-row: 1 / 3;
      grid-column: 1 / 3;
      .cover {
        height: 342px;
      }
    }
    &:nth-of-type(2) {
      grid-row: 1 / 3;
      grid-column: 3 / 4;
      .cover {
        height: 342px;
      }
    }
    &:nth-of-type(3),
    &:nth-of-type(4) {
      .cover {
        height: 128px;
      }
    }
  }
`;

const StyledCreators = styled.div`
  display: grid;
  grid: repeat(2, 1fr) / repeat(2, 1fr);
  grid-row-gap: 48px;
  grid-column-gap: 80px;
  margin-top: 48px;
`;

const StyledNfts = styled.div`
  width: 100%;
  display: grid;
  justify-content: center;
  grid-template-columns: repeat(4, minmax(0px, 330px));
  gap: 30px 20px;
  margin: 48px auto 0;
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
  .loading-container {
    margin-top: 20px;
    width: 100%;
    text-align: center;
  }
`;

export default Home;
