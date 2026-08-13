import { Link, usePage } from '@inertiajs/react';
import {
    BarChart3,
    ClipboardList,
    LayoutGrid,
    Settings,
    ShoppingCart,
    Tags,
    UsersRound,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { index as ordersIndex } from '@/routes/orders';
import { index as posIndex } from '@/routes/pos';
import { index as productsIndex } from '@/routes/products';
import { index as reportsIndex } from '@/routes/reports';
import { index as settingsIndex } from '@/routes/settings';
import { index as usersIndex } from '@/routes/users';
import type { NavItem } from '@/types';

const adminNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'POS',
        href: posIndex(),
        icon: ShoppingCart,
    },
    {
        title: 'Users',
        href: usersIndex(),
        icon: UsersRound,
    },
    {
        title: 'Orders',
        href: ordersIndex(),
        icon: ClipboardList,
    },
    {
        title: 'Menu',
        href: productsIndex(),
        icon: Tags,
    },
    {
        title: 'Reports',
        href: reportsIndex(),
        icon: BarChart3,
    },
    {
        title: 'Settings',
        href: settingsIndex(),
        icon: Settings,
    },
];

const cashierNavItems: NavItem[] = [
    {
        title: 'POS',
        href: posIndex(),
        icon: ShoppingCart,
    },
    {
        title: 'Orders',
        href: ordersIndex(),
        icon: ClipboardList,
    },
];

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    const { auth } = usePage().props;
    const mainNavItems =
        auth.user?.role === 'cashier' ? cashierNavItems : adminNavItems;

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
