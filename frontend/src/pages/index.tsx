"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as motion from "motion/react-client";
import { AnimatePresence } from "motion/react";
import { PageNavBar } from "@/components/page-nav-bar";
import { SwitchThemeButton } from "@/components/switch-theme-button";
import { Button, Card, Chip, Separator, Spinner } from "@heroui/react";
import Image from "next/image";
import {
  FaAndroid,
  FaApple,
  FaCalendarAlt,
  FaChartBar,
  FaChevronDown,
  FaDownload,
  FaFileAlt,
  FaFilePdf,
  FaGithub,
  FaLock,
  FaPalette,
} from "react-icons/fa";
import Head from "next/head";

interface AppVersionResponse {
  id: string;
  app_id: string;
  platform: string;
  version: string;
  build_number: number;
  min_supported_build_number: number | null;
  changelog: string | null;
  file_url: string | null;
  external_url: string | null;
  filename: string;
  file_size: number;
  content_type: string;
  download_count: number;
  created_at: string;
}

interface AppDetailResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  platform: string | null;
  icon_image_id: string | null;
  created_at: string;
  updated_at: string;
  latest_version: AppVersionResponse | null;
  versions: AppVersionResponse[];
}

interface AppReleaseResponse {
  app_id: string;
  slug: string;
  name: string;
  platform: string;
  current_version: string | null;
  current_build_number: number | null;
  latest_version: AppVersionResponse | null;
  update_available: boolean;
  update_required: boolean;
  update_url: string | null;
}

function formatFileSize(bytes: number): string {
  if (!bytes) return "0 MB";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatPlatform(platform: string): string {
  return platform === "ios" ? "iOS" : "Android";
}

const navItems = [
  { id: "home", label: "课程表" },
  { id: "features", label: "功能特性" },
  { id: "screenshots", label: "展示" },
  { id: "download", label: "下载" },
];

const screenshots = [
  { src: "/image/mysues/liquidglass.png", title: "课程表" },
  { src: "/image/mysues/score.png", title: "成绩单" },
  { src: "/image/mysues/autoimport.png", title: "导入课表" },
  { src: "/image/mysues/examinfo.png", title: "考试信息" },
  { src: "/image/mysues/profile.png", title: "个人中心" },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0, 0, 0.2, 1] },
  },
} as const;

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
} as const;

const floatingAnimation = {
  y: [0, -15, 0],
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: "easeInOut" as const,
  },
};

const floatingLogoAnimation = {
  initial: { scale: 0, rotate: -180 },
  animate: { scale: 1, rotate: 0 },
  transition: { duration: 0.8, ease: [0, 0, 0.2, 1] },
} as const;

const features = [
  {
    icon: FaCalendarAlt,
    title: "课表查询",
    description:
      "随时随地查看课程安排，支持在线教务系统数据同步，提供直观的周视图。",
  },
  {
    icon: FaChartBar,
    title: "成绩查询",
    description: "快速查询各学期成绩绩点，掌握学习进度。",
  },
  {
    icon: FaFileAlt,
    title: "考试信息",
    description: "查看考试时间、地点安排，不再错过任何一场考试。",
  },
  {
    icon: FaFilePdf,
    title: "PDF 导入",
    description: "支持导入学校下发的 PDF 格式成绩单，离线也能看。",
  },
  {
    icon: FaPalette,
    title: "个性化设置",
    description: "支持液态玻璃，自定义背景，可打造专属应用体验。",
  },
  {
    icon: FaLock,
    title: "安全登录",
    description:
      "内置 WebView 登录教务系统，通过 Cookie 管理保持会话，安全便捷。",
  },
];

const APP_SLUG = "mysues";
const IOS_DEFAULT_URL = "https://testflight.apple.com/join/sFcAxekc";

// ---- 无后端静态部署配置（可选）----
// 远程无 PostgreSQL/后端时, 下载区使用以下静态配置兜底, 页面完整可用。
// 可在 frontend/.env.local 中覆盖:
//   NEXT_PUBLIC_ANDROID_URL      Android 安装包直链 / 下载页
//   NEXT_PUBLIC_ANDROID_VERSION  Android 版本号
//   NEXT_PUBLIC_ANDROID_FILENAME Android 文件名
//   NEXT_PUBLIC_ANDROID_SIZE     Android 文件大小 (字节)
const STATIC_ANDROID_URL =
  process.env.NEXT_PUBLIC_ANDROID_URL ||
  "https://github.com/HsxMark/MySUES/releases/latest";
const STATIC_ANDROID_VERSION =
  process.env.NEXT_PUBLIC_ANDROID_VERSION || "1.0.0";
const STATIC_ANDROID_FILENAME =
  process.env.NEXT_PUBLIC_ANDROID_FILENAME || "sanxuanyi.apk";
const STATIC_ANDROID_SIZE = Number(process.env.NEXT_PUBLIC_ANDROID_SIZE) || 0;

function staticAndroidRelease(): AppReleaseResponse {
  return {
    app_id: "static",
    slug: APP_SLUG,
    name: "三旋翼课程表",
    platform: "android",
    current_version: null,
    current_build_number: null,
    latest_version: {
      id: "static",
      app_id: "static",
      platform: "android",
      version: STATIC_ANDROID_VERSION,
      build_number: 0,
      min_supported_build_number: null,
      changelog: null,
      file_url: STATIC_ANDROID_URL,
      external_url: null,
      filename: STATIC_ANDROID_FILENAME,
      file_size: STATIC_ANDROID_SIZE,
      content_type: "application/vnd.android.package-archive",
      download_count: 0,
      created_at: new Date().toISOString(),
    },
    update_available: false,
    update_required: false,
    update_url: STATIC_ANDROID_URL,
  };
}

export default function Home() {
  const [showHistory, setShowHistory] = useState(false);
  const [appData, setAppData] = useState<AppDetailResponse | null>(null);
  const [androidRelease, setAndroidRelease] =
    useState<AppReleaseResponse | null>(null);
  const [iosRelease, setIosRelease] = useState<AppReleaseResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAppData = useCallback(async () => {
    try {
      const [appRes, androidRes, iosRes] = await Promise.all([
        fetch(`/api/apps/by-slug/${APP_SLUG}`),
        fetch(`/api/apps/by-slug/${APP_SLUG}/release?platform=android`),
        fetch(`/api/apps/by-slug/${APP_SLUG}/release?platform=ios`),
      ]);

      if (appRes.ok) {
        const detail: AppDetailResponse = await appRes.json();
        setAppData(detail);
      }
      if (androidRes.ok) {
        const detail: AppReleaseResponse = await androidRes.json();
        setAndroidRelease(detail);
      } else {
        setAndroidRelease(staticAndroidRelease());
      }
      if (iosRes.ok) {
        const detail: AppReleaseResponse = await iosRes.json();
        setIosRelease(detail);
      }
    } catch {
      // 后端不可用 → 使用静态配置兜底，保证下载区可正常展示
      setAndroidRelease(staticAndroidRelease());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppData();
  }, [fetchAppData]);

  const androidLatest = androidRelease?.latest_version ?? null;
  const iosLatest = iosRelease?.latest_version ?? null;
  const iosFallbackVersion =
    !iosLatest && appData?.latest_version?.external_url
      ? appData.latest_version
      : null;
  const iosDisplayVersion = iosLatest ?? iosFallbackVersion;
  const iosUpdateUrl =
    iosRelease?.update_url ?? iosFallbackVersion?.external_url ?? null;
  const olderVersions = useMemo(
    () => appData?.versions.slice() ?? [],
    [appData],
  );

  const importantNotice = androidLatest
    ? `🎉 重要提示：Android 最新版 v${androidLatest.version}-build.${androidLatest.build_number} 已发布，推荐尽快更新。`
    : iosDisplayVersion
      ? `🎉 重要提示：iOS 最新版 v${iosDisplayVersion.version}-build.${iosDisplayVersion.build_number} 已发布，欢迎前往 TestFlight 更新。`
      : null;

  const openUrl = (url: string | null | undefined) => {
    if (url) {
      window.open(url, "_blank");
    }
  };

  return (
    <>
      <Head>
        <title>三旋翼课程表</title>
        <meta
          name="description"
          content="三旋翼课程表 是一款校园生活助手 App，支持课表查询、成绩查询、考试信息等功能。"
        />
      </Head>

      <main className="bg-[var(--background)] text-[var(--foreground)]">
        <PageNavBar
          items={navItems}
          logo={
            <div className="flex items-center gap-2">
              <Image
                src="/image/mysues/MySUES.png"
                alt="三旋翼课程表"
                width={32}
                height={32}
                className="h-8 w-8 rounded-lg"
              />
              <span className="hidden font-semibold tracking-tight sm:inline-block">
                三旋翼课程表
              </span>
            </div>
          }
          actions={<SwitchThemeButton />}
        />

        {importantNotice && (
          <div className="sticky top-14 z-40 border-b-2 border-red-500/50 bg-red-500/10 px-4 py-3 text-center backdrop-blur-md">
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
              {importantNotice}
            </p>
          </div>
        )}

        <section
          id="home"
          className="flex min-h-screen flex-col items-center justify-center px-8"
        >
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center"
          >
            <motion.div
              animate={floatingAnimation}
              className="mb-8 flex justify-center"
            >
              <motion.div
                initial={floatingLogoAnimation.initial}
                animate={floatingLogoAnimation.animate}
                transition={floatingLogoAnimation.transition}
              >
                <Image
                  src="/image/mysues/MySUES.png"
                  alt="三旋翼课程表"
                  width={200}
                  height={200}
                  className="h-40 w-40 rounded-[2rem] drop-shadow-2xl sm:h-48 sm:w-48"
                  priority
                />
              </motion.div>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-5xl font-bold tracking-tight sm:text-7xl"
            >
              三旋翼课程表
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="mt-2 text-xl font-semibold text-[var(--muted)] sm:text-2xl"
            >
              SANXUANYI
            </motion.p>
            <motion.p
              variants={fadeInUp}
              className="mx-auto mt-6 max-w-2xl text-lg text-[var(--muted)]"
            >
              一款开源、免费、优美的课程表软件
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="mt-10 flex flex-wrap items-center justify-center gap-3"
            >
              <Chip variant="soft" size="lg">
                <span className="flex items-center gap-1.5">
                  <FaApple className="h-4 w-4" />
                  iOS 14.0+
                </span>
              </Chip>
              <Chip variant="soft" size="lg">
                <span className="flex items-center gap-1.5">
                  <FaAndroid className="h-4 w-4" />
                  Android 12.0+
                </span>
              </Chip>
            </motion.div>

            <motion.div variants={fadeInUp} className="mt-12">
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-[var(--muted)]"
              >
                <svg
                  className="mx-auto h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        <motion.section
          id="features"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="flex min-h-screen flex-col items-center justify-center px-8 py-20"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-4xl font-bold sm:text-5xl"
          >
            功能特性
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="mt-6 max-w-2xl text-center text-lg text-[var(--muted)]"
          >
            一站式校园教务信息查询，让你的大学生活更加便捷
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="mt-16 grid w-full max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={fadeInUp}>
                <Card className="h-full border border-[var(--border)] bg-[var(--surface)]">
                  <div className="p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)]/10">
                      <feature.icon className="h-6 w-6 text-[var(--accent)]" />
                    </div>
                    <h3 className="text-lg font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {feature.description}
                    </p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        <motion.section
          id="screenshots"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="flex flex-col items-center justify-center px-8 py-20"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-4xl font-bold sm:text-5xl"
          >
            展示
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="mt-6 max-w-2xl text-center text-lg text-[var(--muted)]"
          >
            简洁直观的界面设计，轻松掌握校园信息
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="mt-16 grid w-full max-w-6xl grid-cols-2 gap-6 sm:grid-cols-3 sm:gap-8 lg:grid-cols-5"
          >
            {screenshots.map((shot) => (
              <motion.div
                key={shot.title}
                variants={fadeInUp}
                className="flex flex-col items-center gap-4"
              >
                <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                  <Image
                    src={shot.src}
                    alt={shot.title}
                    width={280}
                    height={607}
                    className="h-auto w-full"
                  />
                </div>
                <span className="text-sm font-medium text-[var(--muted)]">
                  {shot.title}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        <motion.section
          id="download"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={staggerContainer}
          className="flex min-h-[60vh] flex-col items-center justify-center px-8 py-20"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-4xl font-bold sm:text-5xl"
          >
            立即下载
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="mt-6 max-w-2xl text-center text-lg text-[var(--muted)]"
          >
            选择你的平台，开始使用 三旋翼课程表
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="mt-4 flex flex-col items-center gap-2"
          >
            {loading ? (
              <Spinner size="sm" />
            ) : (
              <>
                {androidLatest && (
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <Chip variant="soft" size="sm">
                      <span className="flex items-center gap-1.5">
                        <FaAndroid className="h-3 w-3" />v
                        {androidLatest.version}
                      </span>
                    </Chip>
                    <span>
                      build {androidLatest.build_number} ·{" "}
                      {androidLatest.filename} (
                      {formatFileSize(androidLatest.file_size)})
                    </span>
                  </div>
                )}
                {iosDisplayVersion && (
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <Chip variant="soft" size="sm">
                      <span className="flex items-center gap-1.5">
                        <FaApple className="h-3 w-3" />v
                        {iosDisplayVersion.version}
                      </span>
                    </Chip>
                    <span>
                      build {iosDisplayVersion.build_number} · TestFlight / App
                      Store
                    </span>
                  </div>
                )}
                {!androidLatest && !iosDisplayVersion && (
                  <span className="text-sm text-[var(--muted)]">
                    暂无版本信息
                  </span>
                )}
              </>
            )}
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="mt-12 flex flex-wrap items-center justify-center gap-4"
          >
            <a
              href={iosUpdateUrl ?? IOS_DEFAULT_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="通过 TestFlight 下载 iOS 版"
              className="transition-opacity hover:opacity-80"
            >
              <Image
                src="/image/mysues/testflight.svg"
                alt="Download on the TestFlight"
                width={138}
                height={42}
                className="h-11 w-auto md:h-10"
                unoptimized
              />
            </a>
            <Button
              size="lg"
              variant="primary"
              className="px-8 font-semibold"
              isDisabled={!androidRelease?.update_url}
              onPress={() => openUrl(androidRelease?.update_url)}
            >
              <FaAndroid className="mr-2 h-5 w-5" />
              {androidLatest
                ? `Android 下载 (${formatFileSize(androidLatest.file_size)})`
                : "Android 暂无可用版本"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-8 font-semibold"
              onPress={() =>
                window.open("https://github.com/HsxMark/MySUES", "_blank")
              }
            >
              <FaGithub className="mr-2 h-5 w-5" />
              GitHub
            </Button>
          </motion.div>

          <motion.div variants={fadeInUp} className="mt-10 w-full max-w-xl">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              <span>版本历史</span>
              <motion.span
                animate={{ rotate: showHistory ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="inline-flex"
              >
                <FaChevronDown className="h-3 w-3" />
              </motion.span>
            </button>

            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 space-y-3">
                    {olderVersions.map((v, index) => {
                      const href =
                        v.platform === "ios"
                          ? v.external_url
                          : `/api/apps/${v.app_id}/versions/${v.id}/download/${encodeURIComponent(v.filename)}`;
                      return (
                        <div
                          key={v.id}
                          className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                            index === 0
                              ? "border border-[var(--accent)]/30 bg-[var(--accent)]/5"
                              : "border border-[var(--border)]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {index === 0 && (
                              <Chip variant="soft" size="sm" color="accent">
                                最新
                              </Chip>
                            )}
                            <Chip size="sm" variant="soft">
                              {formatPlatform(v.platform)}
                            </Chip>
                            <span className="text-sm font-medium">
                              v{v.version}
                            </span>
                            <span className="text-xs text-[var(--muted)]">
                              build {v.build_number}
                            </span>
                            <span className="text-xs text-[var(--muted)]">
                              {v.platform === "android"
                                ? formatFileSize(v.file_size)
                                : "外部更新链接"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-[var(--muted)]">
                              {formatDate(v.created_at)}
                            </span>
                            {href && (
                              <a
                                href={href}
                                className="text-xs text-[var(--accent)] hover:underline"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <FaDownload className="inline h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {olderVersions.length === 0 && (
                      <div className="py-4 text-center text-sm text-[var(--muted)]">
                        暂无版本记录
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.section>

        <footer className="border-t border-[var(--border)] bg-[var(--background)]">
          <div className="container mx-auto px-6 py-12">
            <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="col-span-1 md:col-span-2">
                <div className="mb-4 flex items-center gap-3">
                  <Image
                    src="/image/mysues/MySUES.png"
                    alt="三旋翼课程表"
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-xl"
                  />
                  <div>
                    <div className="text-xl font-bold">三旋翼课程表</div>
                    <div className="text-sm text-[var(--muted)]">SANXUANYI</div>
                  </div>
                </div>
                <p className="max-w-md text-sm text-[var(--muted)]">
                  软件全程由 HsxMark 打造
                </p>
              </div>

              <div>
                <h3 className="mb-3 font-semibold">快速链接</h3>
                <div className="flex flex-col gap-2">
                  {navItems.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                    >
                      {item.label}
                    </a>
                  ))}
                  <a
                    href="https://github.com/HsxMark/MySUES"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                  >
                    GitHub
                  </a>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-3">
              <div className="rounded-lg border-2 border-yellow-500/50 bg-yellow-500/10 p-4">
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  本项目为开发者个人开发的非官方应用，仅供学习交流使用。应用内所有数据均直接来源于学校教务系统，本项目不保存任何用户的账号密码。请勿将本项目用于任何商业用途。
                </p>
              </div>
              <div className="flex flex-col items-center justify-between gap-2 text-sm text-[var(--muted)] sm:flex-row">
                <p>
                  Made with Flutter by{" "}
                  <span className="font-medium text-[var(--foreground)]">
                    HsxMark
                  </span>
                </p>
                <div className="flex flex-col items-center gap-1 sm:items-end">
                  <p>© 2026 三旋翼课程表. 保留所有权利.</p>
                  <a
                    href="https://beian.miit.gov.cn/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                  >
                    鲁ICP备2026043859号-1
                  </a>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
