"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

/**
 * Internal dev-only page to verify Design Tokens and base components.
 * NOT part of the product navigation. Not linked from Sidebar.
 * Route: /dev/design-system
 */
export default function DesignSystemPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas p-8">
      <div className="mx-auto max-w-4xl space-y-12">
        {/* Header */}
        <div>
          <h1 className="font-serif text-3xl text-ink-primary">
            Design System
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Internal verification page — not part of product navigation.
          </p>
        </div>

        {/* ── Color Tokens ─────────────────────────── */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-ink-primary">
            Background System
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <ColorSwatch label="Canvas" value="#F5F4EF" className="bg-canvas" />
            <ColorSwatch
              label="Workspace"
              value="#FFFFFF"
              className="bg-workspace border border-border"
            />
            <ColorSwatch
              label="Surface Subtle"
              value="#EFEEE9"
              className="bg-surface-subtle"
            />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-ink-primary">
            Ink Palette
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <ColorSwatch
              label="Primary"
              value="#181A18"
              className="bg-ink-primary"
              dark
            />
            <ColorSwatch
              label="Secondary"
              value="#5F625D"
              className="bg-ink-secondary"
              dark
            />
            <ColorSwatch
              label="Muted"
              value="#92968F"
              className="bg-ink-muted"
              dark
            />
            <ColorSwatch
              label="Faint"
              value="#B8BBB5"
              className="bg-ink-faint"
            />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-ink-primary">
            Mint Accent
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <ColorSwatch
              label="Mint 600"
              value="#4E9F84"
              className="bg-mint-600"
              dark
            />
            <ColorSwatch
              label="Mint 500"
              value="#68B79B"
              className="bg-mint-500"
              dark
            />
            <ColorSwatch
              label="Mint 300"
              value="#A9D9C7"
              className="bg-mint-300"
            />
            <ColorSwatch
              label="Mint 100"
              value="#E7F3EE"
              className="bg-mint-100"
            />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-ink-primary">
            Semantic Colors
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <ColorSwatch
              label="Success"
              value="#4E9F84"
              className="bg-success"
              dark
            />
            <ColorSwatch
              label="Warning"
              value="#C38A3A"
              className="bg-warning"
              dark
            />
            <ColorSwatch
              label="Danger"
              value="#B85B57"
              className="bg-danger"
              dark
            />
            <ColorSwatch
              label="Neutral"
              value="#858982"
              className="bg-neutral-status"
              dark
            />
          </div>
        </section>

        {/* ── Typography ───────────────────────────── */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-ink-primary">
            Typography
          </h2>
          <div className="space-y-3 rounded-[10px] border border-border bg-workspace p-6">
            <p className="font-serif text-2xl text-ink-primary">
              Serif — Editorial Statement
            </p>
            <p className="text-lg font-semibold text-ink-primary">
              Sans — Section Title (18-20px)
            </p>
            <p className="text-[15px] font-semibold text-ink-primary">
              Card Title (15-17px)
            </p>
            <p className="text-sm text-ink-primary">
              Normal UI text (14-16px). The quick brown fox jumps over the lazy
              dog.
            </p>
            <p className="text-sm text-ink-secondary">
              Secondary text — descriptions, metadata.
            </p>
            <p className="text-xs text-ink-muted">
              Meta text — time, source, helper (12-13px).
            </p>
            <p className="text-xs text-ink-faint">
              Faint — disabled, decorative.
            </p>
          </div>
        </section>

        {/* ── Buttons ──────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-ink-primary">
            Buttons
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="primary" size="sm">
              Small
            </Button>
            <Button variant="primary" size="lg">
              Large
            </Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </div>
        </section>

        {/* ── Inputs ───────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-ink-primary">
            Inputs
          </h2>
          <div className="max-w-md space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                Default
              </label>
              <Input placeholder="Enter text..." />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                Disabled
              </label>
              <Input placeholder="Disabled input" disabled />
            </div>
          </div>
        </section>

        {/* ── Cards ────────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-ink-primary">
            Cards
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Signal Card</CardTitle>
                <CardDescription>
                  Example of a business object card
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-ink-secondary">
                  Cards are for independent business objects only. Information
                  sections use layout, not nested cards.
                </p>
              </CardContent>
              <CardFooter>
                <Badge variant="mint">Selected</Badge>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Content Card</CardTitle>
                <CardDescription>Border-first, no shadow</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-ink-secondary">
                  10px radius, border, whitespace for hierarchy.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ── Badges / Chips ───────────────────────── */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-ink-primary">
            Status Chips
          </h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">NEW</Badge>
            <Badge variant="default">DRAFT</Badge>
            <Badge variant="mint">SELECTED</Badge>
            <Badge variant="warning">REVIEW</Badge>
            <Badge variant="danger">OVERDUE</Badge>
            <Badge variant="success">PUBLISHED</Badge>
            <Badge variant="outline">OUTLINE</Badge>
          </div>
        </section>

        {/* ── Tabs ─────────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-ink-primary">Tabs</h2>
          <Tabs defaultValue="brief" className="w-full">
            <TabsList>
              <TabsTrigger value="brief">Brief</TabsTrigger>
              <TabsTrigger value="master">Master</TabsTrigger>
              <TabsTrigger value="platforms">Platforms</TabsTrigger>
              <TabsTrigger value="review">Review</TabsTrigger>
            </TabsList>
            <TabsContent value="brief">
              <p className="text-sm text-ink-secondary">
                Brief tab content. Active tab uses mint underline + stronger
                text.
              </p>
            </TabsContent>
            <TabsContent value="master">
              <p className="text-sm text-ink-secondary">
                Master tab content.
              </p>
            </TabsContent>
            <TabsContent value="platforms">
              <p className="text-sm text-ink-secondary">
                Platforms tab content.
              </p>
            </TabsContent>
            <TabsContent value="review">
              <p className="text-sm text-ink-secondary">
                Review tab content.
              </p>
            </TabsContent>
          </Tabs>
        </section>

        {/* ── Dialog (Modal) ───────────────────────── */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-ink-primary">
            Dialog (Modal)
          </h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Mark as Published</DialogTitle>
                <DialogDescription>
                  Example of a blocking confirmation modal. Used only for
                  critical actions.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-ink-secondary">
                  Modal radius: 14px. Workspace background. Light shadow.
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setDialogOpen(false)}
                >
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>

        {/* ── Drawer ───────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-ink-primary">
            Drawer
          </h2>
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerTrigger asChild>
              <Button variant="secondary">Open Drawer</Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Content Quick View</DrawerTitle>
                <DrawerDescription>
                  Drawer slides from right. 380–480px wide. Normal motion.
                </DrawerDescription>
              </DrawerHeader>
              <div className="py-4">
                <p className="text-sm text-ink-secondary">
                  Used for: Content Quick View, Create Test, Signal details,
                  Quick editing. Light shadow. Background context preserved.
                </p>
              </div>
            </DrawerContent>
          </Drawer>
        </section>

        {/* ── Motion Durations ─────────────────────── */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-ink-primary">
            Motion Tokens
          </h2>
          <div className="space-y-2 text-sm text-ink-secondary">
            <p>
              <code className="rounded bg-surface-subtle px-1.5 py-0.5 text-xs">
                --duration-fast: 150ms
              </code>{" "}
              — hover, checkbox, tooltip, filter
            </p>
            <p>
              <code className="rounded bg-surface-subtle px-1.5 py-0.5 text-xs">
                --duration-normal: 260ms
              </code>{" "}
              — tab, drawer, card transition, diff
            </p>
            <p>
              <code className="rounded bg-surface-subtle px-1.5 py-0.5 text-xs">
                --duration-expressive: 500ms
              </code>{" "}
              — page entrance, echo, halftone, major success
            </p>
          </div>
        </section>

        {/* ── Radius ───────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-ink-primary">
            Border Radius
          </h2>
          <div className="flex flex-wrap items-end gap-4">
            <RadiusDemo label="Button" value="8px" radius="8px" />
            <RadiusDemo label="Input" value="8px" radius="8px" />
            <RadiusDemo label="Card" value="10px" radius="10px" />
            <RadiusDemo label="Card Lg" value="12px" radius="12px" />
            <RadiusDemo label="Modal" value="14px" radius="14px" />
            <RadiusDemo label="Media" value="16px" radius="16px" />
            <RadiusDemo label="Pill" value="999px" radius="999px" />
          </div>
        </section>
      </div>
    </div>
  );
}

/* ── Helper Components ─────────────────────────────── */

function ColorSwatch({
  label,
  value,
  className,
  dark,
}: {
  label: string;
  value: string;
  className: string;
  dark?: boolean;
}) {
  return (
    <div>
      <div
        className={`flex h-16 items-end rounded-[8px] border border-border p-2 ${className}`}
      >
        <span
          className={`text-xs font-mono ${dark ? "text-white/70" : "text-ink-muted"}`}
        >
          {value}
        </span>
      </div>
      <p className="mt-1.5 text-xs font-medium text-ink-secondary">{label}</p>
    </div>
  );
}

function RadiusDemo({
  label,
  value,
  radius,
}: {
  label: string;
  value: string;
  radius: string;
}) {
  return (
    <div className="text-center">
      <div
        className="h-16 w-16 border border-border bg-mint-100"
        style={{ borderRadius: radius }}
      />
      <p className="mt-1 text-xs font-medium text-ink-secondary">{label}</p>
      <p className="text-xs text-ink-muted">{value}</p>
    </div>
  );
}
