import { CTADetails } from "@/types";

interface Props {
  cta: CTADetails;
}

const CTA: React.FC<Props> = ({ cta }) => {
  return (
    <section id="cta" className="mt-10 mb-5 lg:my-20">
      <div className="relative h-full w-full z-10 mx-auto py-12 sm:py-20">
        <div className="h-full w-full">
          <div className="rounded-3xl opacity-95 absolute inset-0 -z-10 h-full w-full bg-[#050a02] bg-[linear-gradient(to_right,#12170f_1px,transparent_1px),linear-gradient(to_bottom,#12170f_1px,transparent_1px)] bg-[size:6rem_4rem]">
            <div className="rounded-3xl absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_600px_at_50%_500px,#1C1C02,transparent)]"></div>
          </div>

            <div className="h-full flex flex-col items-center justify-center text-white text-center px-5">
            <h2 className="text-2xl sm:text-3xl md:text-5xl md:leading-tight font-semibold mb-4 max-w-2xl">
              {cta.heading}
            </h2>

            <p className="mx-auto max-w-xl md:px-5">{cta.subheading}</p>

            <a
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-base font-semibold text-gray-900 shadow-md transition hover:-translate-y-[1px] hover:shadow-lg"
              href={cta.primaryButton.href}
            >
              <span className="text-sm font-medium text-gray-500 mr-2">{cta.primaryButton.topLabel}</span>
              <span>{cta.primaryButton.bottomLabel}</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
