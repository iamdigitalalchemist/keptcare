"use client";

import { LayoutDashboard, Users, Bot, MessageSquare, Megaphone, Bell, CreditCard, Settings, ShieldCheck, Star, Filter, BarChart3, CalendarCheck, Building2 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useSubscription } from "@/contexts/SubscriptionContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const mainNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Patients", url: "/patients", icon: Users },
  { title: "Appointments", url: "/appointments", icon: CalendarCheck },
  { title: "Segments", url: "/segments", icon: Filter },
  { title: "Loyalty", url: "/loyalty", icon: Star },
  { title: "Automations", url: "/automations", icon: Bot },
  { title: "Messages", url: "/messages", icon: MessageSquare },
  { title: "Campaigns", url: "/campaigns", icon: Megaphone },
  { title: "Alerts", url: "/alerts", icon: Bell },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

const bottomNav = [
  { title: "Pricing", url: "/pricing", icon: CreditCard },
  { title: "Settings", url: "/settings", icon: Settings },
];

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "KC";
}

export function AppSidebar() {
  const { state } = useSidebar();
  const { hasPermission, isPlatformAdmin, organisation } = useSubscription();
  const collapsed = state === "collapsed";
  const canManageOrganisation = hasPermission("users.manage") || hasPermission("roles.manage") || hasPermission("organisation.manage");
  const organisationName = organisation?.name || "KeptCare";
  const logoUrl = organisation?.logo_url || "";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0 overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt={`${organisationName} logo`} className="h-full w-full object-cover" />
            ) : (
              <span className="text-sidebar-primary-foreground font-bold text-sm">{getInitials(organisationName)}</span>
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-sidebar-accent-foreground truncate">{organisationName}</p>
              <p className="text-xs text-sidebar-foreground truncate">Patient CRM</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink href={item.url} end={item.url === "/dashboard"} activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {canManageOrganisation && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink href="/organisation" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                  <Building2 className="h-4 w-4" />
                  {!collapsed && <span>Organisation</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {isPlatformAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink href="/admin" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                  <ShieldCheck className="h-4 w-4" />
                  {!collapsed && <span>Admin</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {bottomNav.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink href={item.url} activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                  <item.icon className="h-4 w-4" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
