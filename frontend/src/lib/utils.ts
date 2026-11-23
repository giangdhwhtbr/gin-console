import { createCn } from "cn/config"

// `text-13` is a font size (--text-13 in index.css), not a text colour: without this it drops `text-primary-foreground`.
export const cn = createCn({ extend: { classGroups: { "font-size": [{ text: ["13"] }] } } })
