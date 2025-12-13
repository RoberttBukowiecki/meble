"use client";

import Image, { StaticImageData } from "next/image";
import { useTranslations } from "next-intl";
import { Container } from "./Container";

import userOneImg from "../../public/img/user1.jpg";
import userTwoImg from "../../public/img/user2.jpg";
import userThreeImg from "../../public/img/user3.jpg";

export function Testimonials() {
  const t = useTranslations("testimonials");

  return (
    <Container>
      <div className="grid gap-10 lg:grid-cols-2 xl:grid-cols-3">
        <div className="lg:col-span-2 xl:col-auto">
          <div className="flex flex-col justify-between w-full h-full bg-gray-100 px-14 rounded-2xl py-14 dark:bg-trueGray-800">
            <div className="mb-4 flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <StarIcon key={i} className="h-5 w-5 text-yellow-500" />
              ))}
            </div>
            <p className="text-2xl leading-normal">
              {t.rich("reviews.1.text", {
                highlight: (chunks) => <Mark>{chunks}</Mark>,
              })}
            </p>

            <Avatar
              image={userOneImg}
              name={t("reviews.1.name")}
              title={t("reviews.1.title")}
            />
          </div>
        </div>
        <div>
          <div className="flex flex-col justify-between w-full h-full bg-gray-100 px-14 rounded-2xl py-14 dark:bg-trueGray-800">
            <div className="mb-4 flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <StarIcon key={i} className="h-5 w-5 text-yellow-500" />
              ))}
            </div>
            <p className="text-2xl leading-normal">
              {t.rich("reviews.2.text", {
                highlight: (chunks) => <Mark>{chunks}</Mark>,
              })}
            </p>

            <Avatar
              image={userTwoImg}
              name={t("reviews.2.name")}
              title={t("reviews.2.title")}
            />
          </div>
        </div>
        <div>
          <div className="flex flex-col justify-between w-full h-full bg-gray-100 px-14 rounded-2xl py-14 dark:bg-trueGray-800">
            <div className="mb-4 flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <StarIcon key={i} className="h-5 w-5 text-yellow-500" />
              ))}
            </div>
            <p className="text-2xl leading-normal">
              {t.rich("reviews.3.text", {
                highlight: (chunks) => <Mark>{chunks}</Mark>,
              })}
            </p>

            <Avatar
              image={userThreeImg}
              name={t("reviews.3.name")}
              title={t("reviews.3.title")}
            />
          </div>
        </div>
      </div>
    </Container>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

interface AvatarProps {
  image: StaticImageData;
  name: string;
  title: string;
}

function Avatar({ image, name, title }: AvatarProps) {
  return (
    <div className="flex items-center mt-8 space-x-3">
      <div className="flex-shrink-0 overflow-hidden rounded-full w-14 h-14">
        <Image
          src={image}
          width={40}
          height={40}
          alt="Avatar"
          placeholder="blur"
          className="w-full h-full object-cover"
        />
      </div>
      <div>
        <div className="text-lg font-medium">{name}</div>
        <div className="text-gray-600 dark:text-gray-400">{title}</div>
      </div>
    </div>
  );
}

interface MarkProps {
  children: React.ReactNode;
}

function Mark({ children }: MarkProps) {
  return (
    <mark className="text-indigo-800 bg-indigo-100 rounded-md ring-indigo-100 ring-4 dark:ring-indigo-900 dark:bg-indigo-900 dark:text-indigo-200">
      {children}
    </mark>
  );
}
