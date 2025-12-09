import { APP_NAME } from '@meble/constants';

export const siteDetails = {
    siteName: APP_NAME,
    siteUrl: 'https://finwise-omega.vercel.app/',
    metadata: {
        title: `${APP_NAME} - Next.js and Tailwind CSS Landing Page Template`,
        description: `${APP_NAME} empowers businesses with cutting-edge technology solutions to drive success and efficiency.`,
    },
    language: 'en-us',
    locale: 'en-US',
    siteLogo: `${process.env.BASE_PATH || ''}/images/logo.png`, // or use a string for the logo e.g. "TechStartup"
    googleAnalyticsId: '', // e.g. G-XXXXXXX,
}