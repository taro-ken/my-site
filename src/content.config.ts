import { defineCollection, z } from "astro:content";

const projects = defineCollection({
	type: "content",
	schema: z.object({
		title: z.string(),
		date: z.string().optional(),              // 公開日/納品日
		description: z.string(),
		tags: z.array(z.string()).default([]),    // ["iOS","SwiftUI","Firebase"]
		role: z.string().optional(),              // "iOS Engineer"
		link: z.string().url().optional(),        // 外部リンク
		image: z.string().optional(),             // /images/xxx.webp
		featured: z.boolean().default(false),
	}),
});

export const collections = { projects };
