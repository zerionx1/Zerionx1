import "server-only";

import { insert, remove, select, update } from "@/lib/supabase/rest";
import type { CmsBlockType } from "@/types/cms-v2";

type SaveCmsPageInput = {
  title?: string;
  slug?: string;
  status?: "draft" | "published";
  seoTitle?: string;
  seoDescription?: string;
};

type SaveCmsBlockInput = {
  title?: string;
  subtitle?: string;
  body?: string;
  buttonLabel?: string;
  buttonHref?: string;
  visible?: boolean;
  position?: number;
  settings?: Record<string, unknown>;
};

export async function listCmsPages() {
  return select("cms_pages_v2", "order=updated_at.desc");
}

export async function getCmsPage(id: string) {
  const page = (
    await select("cms_pages_v2", `id=eq.${id}&limit=1`)
  )[0];

  if (!page) {
    throw new Error("CMS page not found");
  }

  const blocks = await select(
    "cms_blocks_v2",
    `page_id=eq.${id}&order=position.asc`,
  );

  return { page, blocks };
}

export async function createCmsPage(input: {
  slug: string;
  title: string;
}) {
  const now = new Date().toISOString();

  return insert("cms_pages_v2", {
    slug: input.slug.trim().replace(/^\/+/, ""),
    title: input.title.trim(),
    status: "draft",
    seo_title: input.title.trim(),
    seo_description: "",
    created_at: now,
    updated_at: now,
  });
}

export async function saveCmsPage(
  id: string,
  input: SaveCmsPageInput,
) {
  return update("cms_pages_v2", `id=eq.${id}`, {
    ...(input.title !== undefined
      ? { title: input.title }
      : {}),
    ...(input.slug !== undefined
      ? { slug: input.slug.replace(/^\/+/, "") }
      : {}),
    ...(input.status !== undefined
      ? { status: input.status }
      : {}),
    ...(input.seoTitle !== undefined
      ? { seo_title: input.seoTitle }
      : {}),
    ...(input.seoDescription !== undefined
      ? { seo_description: input.seoDescription }
      : {}),
    updated_at: new Date().toISOString(),
  });
}

export async function createCmsBlock(
  pageId: string,
  type: CmsBlockType,
  position: number,
) {
  const now = new Date().toISOString();

  return insert("cms_blocks_v2", {
    page_id: pageId,
    block_type: type,
    title: type === "hero" ? "New hero heading" : "New section",
    subtitle: "",
    body: "",
    button_label: "",
    button_href: "",
    visible: true,
    position,
    settings: {},
    created_at: now,
    updated_at: now,
  });
}

export async function saveCmsBlock(
  id: string,
  input: SaveCmsBlockInput,
) {
  return update("cms_blocks_v2", `id=eq.${id}`, {
    ...(input.title !== undefined
      ? { title: input.title }
      : {}),
    ...(input.subtitle !== undefined
      ? { subtitle: input.subtitle }
      : {}),
    ...(input.body !== undefined
      ? { body: input.body }
      : {}),
    ...(input.buttonLabel !== undefined
      ? { button_label: input.buttonLabel }
      : {}),
    ...(input.buttonHref !== undefined
      ? { button_href: input.buttonHref }
      : {}),
    ...(input.visible !== undefined
      ? { visible: input.visible }
      : {}),
    ...(input.position !== undefined
      ? { position: input.position }
      : {}),
    ...(input.settings !== undefined
      ? { settings: input.settings }
      : {}),
    updated_at: new Date().toISOString(),
  });
}

export async function deleteCmsBlock(id: string) {
  return remove("cms_blocks_v2", `id=eq.${id}`);
}
