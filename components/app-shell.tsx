"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpenCheck, ChevronDown, ClipboardList, Compass, LayoutDashboard, Settings2, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

const navigation = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/learn", label: "Learn", icon: Compass },
  { href: "/student/quizzes", label: "Student quizzes", icon: BookOpenCheck },
  { href: "/assess", label: "Assess", icon: ClipboardList },
  { href: "/teacher", label: "Teacher space", icon: UsersRound },
];

function NavLink({ href, label, icon: Icon }: (typeof navigation)[number]) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link className={`nav-link${active ? " nav-link-active" : ""}`} href={href} aria-current={active ? "page" : undefined}>
      <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
      <span>{label}</span>
      {active && <span className="nav-current-dot" aria-hidden="true" />}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-frame">
      <aside className="sidebar" aria-label="Primary navigation">
        <Link className="brand-lockup" href="/" aria-label="LearnLoop home">
          <Image src="/learnloop-mark.svg" width={38} height={38} alt="" priority />
          <span className="brand-wordmark">Learn<span>Loop</span><small>AI learning studio</small></span>
        </Link>
        <div className="workspace-switcher">
          <div className="workspace-monogram">D</div>
          <div className="workspace-label"><span>Data Alchemists</span><small>Learning workspace</small></div>
          <ChevronDown size={15} aria-hidden="true" />
        </div>
        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="primary-nav">
          {navigation.map((item) => <NavLink key={item.href} {...item} />)}
        </nav>
        <div className="sidebar-section-label sidebar-section-lower">YOUR LEARNING</div>
        <nav className="primary-nav">
          <Link className="nav-link" href="/learn/history"><Activity size={18} strokeWidth={1.9} aria-hidden="true" /><span>Learning history</span></Link>
          <Link className="nav-link" href="/learn"><BookOpenCheck size={18} strokeWidth={1.9} aria-hidden="true" /><span>Python fundamentals</span></Link>
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-note">
          <div className="sidebar-note-icon"><Settings2 size={16} aria-hidden="true" /></div>
          <div><strong>Keep your progress</strong><p>Local demo data stays on this workspace.</p></div>
        </div>
        <div className="profile-row">
          <div className="avatar">MC</div>
          <div className="profile-copy"><strong>Maya Chen</strong><span>Student demo</span></div>
          <span className="online-dot" aria-label="Demo profile" />
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="mobile-brand"><Image src="/learnloop-mark.svg" width={30} height={30} alt="" /><strong>LearnLoop</strong></div>
          <div className="topbar-context"><span className="demo-pill"><span />LOCAL DEMO</span><span className="topbar-separator">•</span><span>Fictional learning workspace</span></div>
          <div className="topbar-right"><span className="context-badge">Python Fundamentals</span><div className="topbar-avatar" aria-label="Maya Chen">MC</div></div>
        </header>
        <main className="main-content">{children}</main>
        <footer className="app-footer"><span>LearnLoop AI</span><span>From learning gaps to lasting growth.</span></footer>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation.slice(0, 4).map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
          return <Link key={href} href={href} className={active ? "mobile-nav-link mobile-nav-active" : "mobile-nav-link"} aria-current={active ? "page" : undefined}><Icon size={19} aria-hidden="true" /><span>{label}</span></Link>;
        })}
      </nav>
    </div>
  );
}
