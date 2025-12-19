/**
 * Sidebar Component
 * Corporate Blue Aesthetic
 */

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    Menu,
    X,
    LayoutDashboard,
    FolderGit2,
    Zap,
    ListTodo,
    Settings,
    Trash2,
    ChevronLeft,
    ChevronRight,
    UserCircle,
    Shield,
    MessageSquare,
    Bot
} from "lucide-react";
import routes from "@/app/routes";
import { version } from "../../../package.json";

// Icon mapping for routes
const routeIcons: Record<string, React.ReactNode> = {
    "/": <Bot className="w-5 h-5" />,
    "/dashboard": <LayoutDashboard className="w-5 h-5" />,
    "/projects": <FolderGit2 className="w-5 h-5" />,
    "/instant-analysis": <Zap className="w-5 h-5" />,
    "/audit-tasks": <ListTodo className="w-5 h-5" />,
    "/audit-rules": <Shield className="w-5 h-5" />,
    "/prompts": <MessageSquare className="w-5 h-5" />,
    "/admin": <Settings className="w-5 h-5" />,
    "/recycle-bin": <Trash2 className="w-5 h-5" />,
};

interface SidebarProps {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    const visibleRoutes = routes.filter(route => route.visible !== false);

    return (
        <>
            {/* Mobile Menu Button */}
            <Button
                variant="ghost"
                size="sm"
                className="fixed top-4 left-4 z-50 md:hidden bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                onClick={() => setMobileOpen(!mobileOpen)}
            >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>

            {/* Overlay for mobile */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed top-0 left-0 h-screen
                    bg-white border-r border-slate-200
                    z-40 transition-all duration-300 ease-in-out
                    ${collapsed ? "w-20" : "w-64"}
                    ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
                `}
            >
                <div className="flex flex-col h-full relative">
                    {/* Logo Section */}
                    <div className={`
                        relative flex items-center h-[72px]
                        border-b border-slate-200 bg-white
                        ${collapsed ? 'px-3 justify-center' : 'px-4 pr-6'}
                    `}>
                        <Link
                            to="/"
                            className={`
                                flex items-center gap-3 group transition-all duration-300
                                ${collapsed ? 'justify-center' : 'flex-1 min-w-0'}
                            `}
                            onClick={() => setMobileOpen(false)}
                        >
                            {/* Logo Icon Removed */}

                            {/* Product Name */}
                            <div className={`
                                flex flex-col min-w-0 transition-opacity duration-300
                                ${collapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}
                            `}>
                                <h1 className="font-bold text-xl tracking-tight text-primary whitespace-nowrap">
                                    CeaAudit
                                </h1>
                            </div>
                        </Link>

                        {/* Collapse Button */}
                        <button
                            className={`
                                hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2
                                w-6 h-6 bg-white border border-slate-200 rounded
                                items-center justify-center text-slate-400
                                hover:bg-blue-50 hover:border-blue-200 hover:text-primary
                                transition-all duration-200
                            `}
                            onClick={() => setCollapsed(!collapsed)}
                            style={{ zIndex: 100 }}
                        >
                            {collapsed ? (
                                <ChevronRight className="w-3 h-3" />
                            ) : (
                                <ChevronLeft className="w-3 h-3" />
                            )}
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
                        <div className="space-y-1">
                            {visibleRoutes.map((route) => {
                                const isActive = location.pathname === route.path;
                                return (
                                    <Link
                                        key={route.path}
                                        to={route.path}
                                        className={`
                                            flex items-center gap-3 px-3 py-2.5
                                            transition-all duration-200 group relative rounded-lg
                                            ${isActive
                                                ? "bg-blue-50 text-priority border border-blue-100"
                                                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
                                            }
                                        `}
                                        onClick={() => setMobileOpen(false)}
                                        title={collapsed ? route.name : undefined}
                                    >
                                        {/* Active indicator */}
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r" />
                                        )}

                                        {/* Icon */}
                                        <span className={`
                                            flex-shrink-0 transition-colors duration-200
                                            ${isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600"}
                                        `}>
                                            {routeIcons[route.path] || <LayoutDashboard className="w-5 h-5" />}
                                        </span>

                                        {/* Label */}
                                        {!collapsed && (
                                            <span className={`
                                                font-mono text-sm tracking-wide
                                                ${isActive ? 'font-semibold' : 'font-medium'}
                                            `}>
                                                {route.name}
                                            </span>
                                        )}

                                        {/* Hover arrow */}
                                        {!isActive && !collapsed && (
                                            <span className="absolute right-3 opacity-0 group-hover:opacity-100 text-xs text-primary transition-opacity">
                                                →
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </nav >

                    {/* Footer */}
                    < div className="p-3 border-t border-slate-200 bg-white space-y-1" >
                        {/* Account Link */}
                        < Link
                            to="/account"
                            className={`
                                flex items-center gap-3 px-3 py-2.5 rounded-lg
                                transition-all duration-200 group
                                ${location.pathname === '/account'
                                    ? "bg-blue-50 text-primary border border-blue-100"
                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
                                }
                            `}
                            onClick={() => setMobileOpen(false)}
                            title={collapsed ? "账号管理" : undefined}
                        >
                            <UserCircle className={`w-5 h-5 flex-shrink-0 ${location.pathname === '/account' ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'
                                }`} />
                            {
                                !collapsed && (
                                    <span className="font-mono text-sm">账号管理</span>
                                )
                            }
                        </Link >

                        {/* System Status & Version */}
                        {!collapsed && (
                            <div className="mt-2 pt-2 border-t border-slate-100 px-3">
                                <div className="flex items-center justify-between py-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest font-bold">
                                            System Ready
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-slate-300 font-mono">v{version}</span>
                                </div>
                            </div>
                        )}
                    </div >
                </div >
            </aside >
        </>
    );
}
