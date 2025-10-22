import { useEffect } from 'react';

import { GetServerSidePropsContext } from 'next';

// This page is a server-side redirect to handle universal links.
// It ensures that referral links work correctly across all platforms.

// This function runs on the server and gets the referral code from the URL query.
export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { code } = context.query;
  
  // Basic validation
  if (!code || typeof code !== 'string') {
    return { props: { code: null } };
  }

  return {
    props: { code }, 
  };
}

// The component receives the code as a prop from the server.
export default function InvitePage({ code }: { code: string | null }) {
	useEffect(() => {
        if (code) {
            const appId = process.env.NEXT_PUBLIC_WLD_APP_ID || 'app_YOUR_APP_ID'; // Placeholder for your App ID
            const path = `/invite?code=${code}`; // The path within the mini-app
            const redirectUrl = `https://world.org/mini-app?app_id=${appId}&path=${path}`;
            
            // Redirect the user's browser to the World App universal link
            window.location.href = redirectUrl;
        }
	}, [code])

	return <div>Redirecting to the app...</div>
}
