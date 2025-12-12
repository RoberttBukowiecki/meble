import { setRequestLocale } from 'next-intl/server';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { SectionTitle } from '@/components/SectionTitle';
import { Benefits } from '@/components/Benefits';
import { Video } from '@/components/Video';
import { Testimonials } from '@/components/Testimonials';
import { Faq } from '@/components/Faq';
import { Cta } from '@/components/Cta';
import { Footer } from '@/components/Footer';
import { PopupWidget } from '@/components/PopupWidget';
import { benefitOne, benefitTwo } from '@/components/data';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Navbar />
      <Hero />
      <SectionTitle
        pretitleKey="benefits.pretitle"
        titleKey="benefits.title"
        descriptionKey="benefits.description"
      />
      <Benefits data={benefitOne} />
      <Benefits imgPos="right" data={benefitTwo} />
      <SectionTitle
        pretitleKey="video.pretitle"
        titleKey="video.title"
        descriptionKey="video.description"
      />
      <Video />
      <SectionTitle
        pretitleKey="testimonials.pretitle"
        titleKey="testimonials.title"
        descriptionKey="testimonials.description"
      />
      <Testimonials />
      <SectionTitle
        pretitleKey="faq.pretitle"
        titleKey="faq.title"
        descriptionKey="faq.description"
      />
      <Faq />
      <Cta />
      <Footer />
      <PopupWidget />
    </>
  );
}
