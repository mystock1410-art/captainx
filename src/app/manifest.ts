import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Captain X — Terminal dữ liệu thị trường",
    short_name: "Captain X",
    description:
      "Theo dõi VN-Index, phái sinh VN30, chỉ số thế giới, tin tức đa nguồn và phân tích AI — realtime.",
    start_url: "/",
    display: "standalone",
    background_color: "#03070b",
    theme_color: "#03070b",
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { src: "/ocbs-logo.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
