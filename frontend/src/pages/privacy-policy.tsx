import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { SwitchThemeButton } from "@/components/switch-theme-button";

/**
 * 隐私政策（/privacy-policy）
 *
 * 二级静态页面，正文与仓库根 privacy.md 一一对应。
 * 内容直接以内联 JSX 渲染（无运行时拉取、无点击展开），
 * 满足隐私合规自动化检测对“可抓取的静态 HTML 全文”的要求。
 * 修改政策时请同步更新本文件与 privacy.md。
 */
export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>三旋翼课程表 - 隐私政策</title>
        <meta
          name="description"
          content="三旋翼课程表（My SUES）隐私政策：我们如何收集、使用、存储和保护您的个人信息。"
        />
      </Head>

      <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
        {/* 顶部小页眉 */}
        <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/image/mysues/MySUES.png"
                alt="三旋翼课程表"
                width={32}
                height={32}
                className="h-8 w-8 rounded-lg"
              />
              <span className="font-semibold tracking-tight">三旋翼课程表</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
              >
                首页
              </Link>
              <SwitchThemeButton />
            </div>
          </div>
        </header>

        <main className="flex-1">
          <article className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              三旋翼课程表（My SUES） 隐私政策
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
              更新日期：2026年9月9日
              <br />
              生效日期：2026年9月9日
            </p>

            <div className="mt-8">
              <p className="leading-7">
                您的隐私安全对 三旋翼课程表（My
                SUES，以下简称&quot;本软件&quot;）至关重要。本软件由第三方独立开发者王俊桦（以下简称&quot;我们&quot;或&quot;开发者&quot;）开发并维护，是一款个人工具软件，
                <strong>并非任何学校官方发布、授权或认可的产品</strong>
                。本隐私政策详细说明了我们如何收集、使用、存储和保护您的个人信息。请在使用本软件前仔细阅读，尤其是以
                <strong>粗体</strong>
                标注的内容。当您点击同意、或实际使用本软件时，即表示您已阅读并同意本政策的全部内容。
              </p>

              <h2 className="mt-10 text-xl font-bold sm:text-2xl">
                核心原则：数据本地化
              </h2>
              <p className="mt-4 leading-7">
                本软件坚守&quot;数据本地化&quot;原则。
                <strong>本软件没有独立的后端服务器</strong>
                ，所有经本软件获取或产生的数据，均仅保存在您的设备本地。除您在使用本软件时主动访问您所在学校的教务系统网站外，本软件
                <strong>不将您的任何数据上传至任何服务器或第三方</strong>。
              </p>

              <h2 className="mt-10 text-xl font-bold sm:text-2xl">
                一、我们如何收集和使用您的个人信息
              </h2>
              <p className="mt-4 leading-7">
                本软件遵循<strong>最小必要</strong>
                原则，自身不在后台收集任何个人信息。下述信息均系您主动使用相应功能时产生，或由您所登录的学校教务系统返回，且仅保存在您的设备本地。
              </p>

              <h3 className="mt-8 text-lg font-semibold">
                1. 账号登录与数据同步
              </h3>
              <ul className="mt-4 list-disc space-y-3 pl-6">
                <li className="leading-7">
                  <strong>登录方式</strong>
                  ：本软件通过内嵌网页（WebView）方式访问
                  <strong>您所在学校的教务系统网站</strong>
                  ，您在校方教务系统的登录页面上完成身份验证。
                </li>
                <li className="leading-7">
                  <strong>账号与密码</strong>
                  ：您输入的全部账号、密码等身份认证信息，均由您本人直接在
                  <strong>校方教务系统的登录页面</strong>
                  中输入并提交给校方，本软件
                  <strong>不代为处理、不收集、不保存、绝不上传</strong>
                  上述信息，也不在本地存储、缓存或记录与您的账号、密码相关的任何内容。
                </li>
                <li className="leading-7">
                  <strong>会话信息（Cookie）</strong>
                  ：为维持您在校教务系统中的登录状态并获取数据，教务系统返回的会话信息（Cookie）会保存在您的设备端（由系统网页组件或应用本地会话管理），
                  <strong>仅用于维持登录状态与获取数据</strong>
                  ，不做任何其他用途。当您执行&quot;清除所有数据&quot;或卸载本软件时，该等会话信息将一并被清除。
                </li>
              </ul>

              <h3 className="mt-8 text-lg font-semibold">
                2. 课程表、成绩、考试安排等教务数据
              </h3>
              <p className="mt-4 leading-7">
                为向您提供课程表、成绩单（含绩点）、考试安排的查询与离线查看功能，本软件会在您设备本地保存上述教务数据，以及其中包含的学号、姓名、学院、专业、班级等与您相关的信息。
                <strong>
                  上述信息仅保存在您的设备本地，本软件不会上传至任何服务器
                </strong>
                ，校方教务系统对其系统内数据的处理，请您查阅校方相关规定。
              </p>

              <h3 className="mt-8 text-lg font-semibold">
                3. 您主动编辑的资料（选填）
              </h3>
              <p className="mt-4 leading-7">
                当您使用&quot;我的资料&quot;等功能时，您可以自行填写昵称、学院、专业、班级，或从相册选择图片作为头像、自定义背景。您自行设置的资料信息与图片文件仅保存在您的设备本地，是否填写、修改或更换由您自行决定。
              </p>

              <h3 className="mt-8 text-lg font-semibold">
                4. 提醒与个性化功能
              </h3>
              <p className="mt-4 leading-7">
                当您设置课程/考试提醒、主题、语言等偏好时，相关设置与您的自定义背景图片仅保存在您设备本地，用于在本机按您的偏好发出提醒或展示界面，本软件不会上传上述内容。
              </p>

              <h3 className="mt-8 text-lg font-semibold">5. 应用完整性自检</h3>
              <p className="mt-4 leading-7">
                为提示运行环境是否安全可信，本软件仅在本机读取您设备上该应用自身的签名信息用于本地校验，
                <strong>不收集设备标识、不上传网络</strong>
                ，校验结果仅用于在本地向您展示安全提示。
              </p>

              <h2 className="mt-10 text-xl font-bold sm:text-2xl">
                二、权限使用说明
              </h2>
              <p className="mt-4 leading-7">
                本软件
                <strong>仅在您使用对应功能、并经您同意后才申请必要权限</strong>
                ，申请时会在系统弹窗中向您说明用途。本软件不会在您同意前或应用启动时未经提示地申请权限。具体如下：
              </p>
              <ul className="mt-4 list-disc space-y-3 pl-6">
                <li className="leading-7">
                  <strong>网络权限</strong>
                  ：用于访问您所在学校的教务系统网站并获取、同步课程表、成绩、考试安排等数据。
                </li>
                <li className="leading-7">
                  <strong>通知权限</strong>
                  ：用于按您设置的课程/考试提醒在本地向您发送通知。仅在您开启相应提醒功能时申请与使用。
                </li>
                <li className="leading-7">
                  <strong>相册/媒体读取权限</strong>
                  ：仅当您选择图片作为头像或自定义背景时使用。
                </li>
              </ul>

              <h2 className="mt-10 text-xl font-bold sm:text-2xl">
                三、第三方服务与共享
              </h2>
              <p className="mt-4 leading-7">
                我们
                <strong>
                  不会向任何第三方出售、出租、共享、转让或公开披露
                </strong>
                您的个人信息，但以下情形除外：依据法律法规或有权机关的要求；或为向您提供本软件功能而访问
                <strong>您主动指定的学校教务系统</strong>
                。除此之外，您的个人信息不会离开您的设备。
              </p>
              <p className="mt-4 leading-7">
                <strong>
                  本软件当前未集成任何会收集个人信息的第三方统计、广告、推送、社交等
                  SDK。
                </strong>{" "}
                本软件所依赖的第三方开源组件（如界面、网络、存储等基础库）仅用于在本地实现功能，不向其传输您的个人信息，具体清单与许可见应用内&quot;开源许可&quot;。如未来确需引入会收集个人信息的第三方服务，我们会
                <strong>
                  先行更新本政策，并通过应用内弹窗等方式再次取得您的同意
                </strong>
                。
              </p>

              <h2 className="mt-10 text-xl font-bold sm:text-2xl">
                四、信息的存储与安全
              </h2>
              <ul className="mt-4 list-disc space-y-3 pl-6">
                <li className="leading-7">
                  <strong>存储位置</strong>
                  ：本软件获取或产生的数据均存储在您设备的本地存储空间（应用沙盒与系统本地设置），不设置服务器端存储。
                </li>
                <li className="leading-7">
                  <strong>保存期限</strong>
                  ：您的数据将保存至您主动清除或卸载本软件时为止。卸载本软件会同时删除本软件保存在设备本地的数据。
                </li>
                <li className="leading-7">
                  <strong>安全保护</strong>
                  ：本软件的数据保存于系统提供的应用隔离沙盒中，我们亦建议您通过系统提供的锁屏、生物识别等方式保护您的设备。
                </li>
                <li className="leading-7">
                  <strong>风险提示</strong>
                  ：由于本软件直接与
                  <strong>您所在学校的教务系统</strong>
                  进行交互，尽管我们采用主流安全技术，但无法控制校方教务系统服务器端的网络传输安全性（特别是若校方系统仅支持
                  HTTP 协议时）。请勿在已 Root
                  或越狱等不受信任的设备上使用本软件，以免本地数据被恶意软件窃取。
                </li>
              </ul>

              <h2 className="mt-10 text-xl font-bold sm:text-2xl">
                五、您的权利
              </h2>
              <ul className="mt-4 list-disc space-y-3 pl-6">
                <li className="leading-7">
                  <strong>查看与更正</strong>
                  ：您可在&quot;我的&quot;→
                  个人资料中查看并更正您自行填写的本地资料信息。
                </li>
                <li className="leading-7">
                  <strong>删除数据</strong>
                  ：您可随时在&quot;设置&quot;中通过&quot;清除所有数据&quot;删除本软件在设备本地保存的课表、成绩、个人资料与偏好设置，以及头像、自定义背景等本地文件与登录会话信息。
                  <strong>卸载本软件亦会删除全部本地数据。</strong>
                </li>
                <li className="leading-7">
                  <strong>撤回同意 / 拒绝使用</strong>
                  ：在首次使用弹窗中，您可选择&quot;不同意并退出&quot;以拒绝继续使用；您也可随时关闭应用内提醒等独立功能，或在系统设置中撤回本软件已获取的相关权限（如通知、相册等），撤回不影响您使用与本功能无关的其他功能。
                </li>
                <li className="leading-7">
                  <strong>关于账号</strong>
                  ：本软件不设立独立账号体系；您在校方教务系统中的账号管理（含注销）请按校方相关规定办理。
                </li>
                <li className="leading-7">
                  <strong>响应您的请求</strong>
                  ：如您对本政策或您的个人信息有任何疑问或请求，请按本政策第八条联系我们，我们将在收到请求后
                  <strong>15 个工作日内</strong>予以答复。
                </li>
              </ul>

              <h2 className="mt-10 text-xl font-bold sm:text-2xl">
                六、未成年人保护
              </h2>
              <p className="mt-4 leading-7">
                本软件面向高校在读学生。若您为未满 18
                周岁的未成年人，请在监护人陪同阅读并同意本政策后使用本软件；若您为不满
                14
                周岁的儿童，请在监护人明确同意与指导下使用。本软件不针对未成年人主动收集个人信息，所处理的信息均来自您就读学校的教务系统或您本人主动提供。
              </p>

              <h2 className="mt-10 text-xl font-bold sm:text-2xl">
                七、本政策的更新
              </h2>
              <p className="mt-4 leading-7">
                本政策可能适时更新。当本政策发生
                <strong>重大变更</strong>
                （如收集信息范围、处理目的、第三方共享情形等发生重大调整）时，我们会在应用内通过弹窗等方式再次向您告知并取得您的同意。更新后的政策将以本政策顶部标注的&quot;更新日期&quot;为准；如您不同意更新后的政策，请停止使用本软件。
              </p>

              <h2 className="mt-10 text-xl font-bold sm:text-2xl">
                八、如何联系我们
              </h2>
              <p className="mt-4 leading-7">
                如您对本隐私政策或个人信息保护有任何疑问、意见或请求，可通过以下方式联系我们：
              </p>
              <ul className="mt-4 list-disc space-y-3 pl-6">
                <li className="leading-7">
                  <strong>开发者</strong>：王俊桦
                </li>
                <li className="leading-7">
                  <strong>电子邮箱</strong>：2469618167@qq.com
                </li>
              </ul>
              <p className="mt-4 leading-7">
                我们会在收到您的反馈后尽快处理，通常将在 15 个工作日内答复您。
              </p>
            </div>
          </article>
        </main>

        <footer className="border-t border-[var(--border)]">
          <div className="mx-auto w-full max-w-3xl px-6 py-8 text-center text-sm text-[var(--muted)]">
            <Link
              href="/"
              className="transition-colors hover:text-[var(--foreground)]"
            >
              返回首页
            </Link>
            <p className="mt-2">© 2026 三旋翼课程表. 保留所有权利.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
