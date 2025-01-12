import React, { useState } from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import CommunityCard from '../../components/CommunityCard';
import { Article } from '../../types/Article';
import { isEmpty } from 'lodash';
import useSWR from 'swr';
import { backendSWRFetcher } from '../../backend/media';
import { Pagination, Spin } from 'antd';
import {
  useTransition,
  useChain,
  animated,
  useSpringRef,
} from '@react-spring/web';

const Community: React.FC = () => {
  const [pageIndex, setPageIndex] = useState(1);
  const [pageLimit, setPageLimit] = useState(10);
  const { data, error } = useSWR(
    `/article?page=${pageIndex}&limit=${pageLimit}`,
    backendSWRFetcher
  );

  // -------- card animated -----------
  const transApi = useSpringRef();
  const transition = useTransition(data ? data.items || [] : [], {
    ref: transApi,
    trail: 400 / data ? (data.items ? data.items.length : 0) : 0,
    from: { opacity: 0, y: 10 },
    enter: { opacity: 1, y: 0 },
    leave: { opacity: 0, y: 10 },
  });

  useChain([transApi], [0, 0.1]);
  // -----------------------------------

  if (!data && !error) {
    return (
      <StyledWrapper>
        <StyledWrapperLoading>
          <Spin tip='Loading...'></Spin>
        </StyledWrapperLoading>
      </StyledWrapper>
    );
  }

  if (error) {
    return (
      <StyledWrapper>
        <StyledWrapperLoading>Please refresh the page...</StyledWrapperLoading>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper>
      <StyledHead>
        <StyledHeadTitle>Community</StyledHeadTitle>
      </StyledHead>
      <StyledItem>
        {transition((style, i: Article, _, idx) => (
          <animated.a
            style={{ ...style }}
            href={`/community/${i.id}`}
            target='_blank'
            key={i.id}>
            <CommunityCard article={i}></CommunityCard>
          </animated.a>
        ))}
        {isEmpty(data.items) ? <div>Empty</div> : ''}
        <StyledPagination>
          <Pagination
            defaultCurrent={pageIndex}
            onChange={(page, pageSize) => setPageIndex(page)}
            showSizeChanger={false}
            total={data.meta.totalItems}></Pagination>
        </StyledPagination>
      </StyledItem>
    </StyledWrapper>
  );
};

const StyledWrapperLoading = styled.div`
  text-align: center;
  margin: 100px 0 0;
`;

const StyledWrapper = styled.div`
  flex: 1;

  max-width: 1114px;
  padding: 48px 20px 256px;
  box-sizing: border-box;

  margin: 0px auto;
  width: 100%;

  @media screen and (max-width: 576px) {
    padding: 20px 10px 80px;
  }
`;
const StyledHead = styled.div``;
const StyledHeadTitle = styled.h2`
  font-size: 48px;
  font-family: 'Playfair Display', serif;
  font-weight: 500;
  color: #333333;
  line-height: 1.2;
  padding: 0;
  margin: 0;

  @media screen and (max-width: 576px) {
    font-size: 22px;
  }
`;
const StyledItem = styled.div`
  & > a {
    display: block;
    margin: 48px 0;
    @media screen and (max-width: 576px) {
      margin: 20px 0;
    }
  }
`;
const StyledPagination = styled.div`
  text-align: center;
`;
export default Community;
