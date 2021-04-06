import React from 'react';
import { Button, Grid, Image, Link, Text } from '@geist-ui/react';
import { getTokenOnScan } from '../../utils/token';
import { GetStaticPropsContext, GetStaticPropsResult, NextPage } from 'next';
import axios from 'axios';
import { ParsedUrlQuery } from 'querystring';
import { BACKEND_CLIENT } from '../../constant';

type Props = {
  post?: {
    id: number;
    backendData: any;
    metadata: {
      description: string;
      name: string;
      mimeType: string;
    };
  };
  isError?: boolean;
};

interface Params extends ParsedUrlQuery {
  id: string;
}

const PostPage: NextPage<Props> = ({ post, isError }) => {
  if (!post && !isError) return <div>Loading</div>;
  if (!post)
    return (
      <div>
        <Text h1>Sorry</Text>
        <Text>But the Token is not exist yet, please check with the URL</Text>
      </div>
    );
  //   if (!data || !metadata) return <div>loading...</div>;
  return (
    <div className='post-page'>
      <Grid.Container gap={2} justify='center'>
        <Grid xs={12}>
          <Image src={post.backendData.tokenURI} />
        </Grid>
        <Grid xs={6}>
          <div className='nft-info'>
            <Text h1 style={{ fontWeight: 400 }}>
              #{post.id} {post.metadata.name}
            </Text>
            <Text>Description: {post.metadata.description}</Text>
            <Text>File type: {post.metadata.mimeType}</Text>
            <Link color href={getTokenOnScan(post.id)} target='_blank'>
              Verify on BSCScan ↗️
            </Link>
            <Link color href={post.backendData.tokenURI} target='_blank'>
              Verify on IPFS ↗️
            </Link>
          </div>
        </Grid>
      </Grid.Container>
    </div>
  );
};

// This function gets called at build time
export async function getStaticProps(
  context: GetStaticPropsContext<Params>
): Promise<GetStaticPropsResult<Props>> {
  const { id } = context.params as Params;
  try {
    // Call an external API endpoint to get posts
    const { data: backendData } = await BACKEND_CLIENT.get(`/media/${id}`);
    const { data: metadata } = await axios.get(backendData.metadataURI);

    return {
      props: {
        post: {
          id: Number(id),
          backendData,
          metadata,
        },
      },
    };
  } catch (error) {
    return { props: { isError: true } };
  }
}

export async function getStaticPaths() {
  const { data } = await BACKEND_CLIENT.get('/media');

  // Get the paths we want to pre-render based on posts
  const paths = data.map((post: any) => ({
    params: { id: String(post.id) },
  }));

  // We'll pre-render only these paths at build time.
  return { paths, fallback: true };
}

export default PostPage;