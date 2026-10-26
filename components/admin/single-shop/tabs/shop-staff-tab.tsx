"use client";

import React from "react";
import { UsersIcon, ShieldCheckIcon, MailIcon, CalendarIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AssignedStaff {
  _id: string;
  name: string;
  email: string;
  role: string;
  assignedAt?: string;
  status?: string;
}

interface ShopStaffTabProps {
  staff: AssignedStaff[];
}

export function ShopStaffTab({ staff }: ShopStaffTabProps) {
  return (
    <div className="space-y-6">
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-muted/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <UsersIcon className="size-6 text-foreground shrink-0" />
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              Assigned Officers &amp; Staff ({staff.length})
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Branch officers authorized to handle POS transactions, process utility bills, and register item sales.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {staff.length === 0 ? (
          <div className="col-span-full py-16 text-center text-muted-foreground glass-card rounded-3xl border border-muted/30">
            <UsersIcon className="size-10 mx-auto opacity-30 mb-2" />
            <p className="text-sm font-semibold text-foreground">No staff officers assigned yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Assign officers from User Management to grant branch operational access.
            </p>
          </div>
        ) : (
          staff.map((stf) => (
            <Card key={stf._id} className="glass-card p-6 rounded-3xl border border-muted/30 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-2xl border border-muted/30 bg-surface/50 flex items-center justify-center font-bold text-sm text-foreground">
                    {stf.name ? stf.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{stf.name}</h4>
                    <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <MailIcon className="size-3" />
                      {stf.email}
                    </span>
                  </div>
                </div>

                <Badge variant="outline" className="text-[10px] uppercase font-mono border-muted/30 bg-surface/50">
                  {stf.role || "STAFF"}
                </Badge>
              </div>

              <div className="pt-3 border-t border-muted/20 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <ShieldCheckIcon className="size-3.5 text-foreground" />
                  Active Officer
                </span>
                {stf.assignedAt && (
                  <span className="flex items-center gap-1 text-[11px] font-mono">
                    <CalendarIcon className="size-3" />
                    {new Date(stf.assignedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
