import { describe, it, expect } from "vitest";
import { formatMarkdown } from "../markdown";

describe("formatMarkdown", () => {
  describe("headers", () => {
    it("converts h1", () => {
      const result = formatMarkdown("# Hello");
      expect(result).toMatch(/<h1 class="[^"]*">Hello<\/h1>/);
    });

    it("converts h2", () => {
      const result = formatMarkdown("## World");
      expect(result).toMatch(/<h2 class="[^"]*">World<\/h2>/);
    });

    it("converts h3", () => {
      const result = formatMarkdown("### Sub");
      expect(result).toMatch(/<h3 class="[^"]*">Sub<\/h3>/);
    });
  });

  describe("inline formatting", () => {
    it("converts bold text", () => {
      const result = formatMarkdown("**bold**");
      expect(result).toMatch(/<strong class="[^"]*">bold<\/strong>/);
    });

    it("converts italic text", () => {
      const result = formatMarkdown("*italic*");
      expect(result).toContain("<em>italic</em>");
    });

    it("converts inline code", () => {
      const result = formatMarkdown("`code`");
      expect(result).toMatch(/<code class="[^"]*">code<\/code>/);
    });
  });

  describe("code blocks", () => {
    it("converts fenced code blocks", () => {
      const input = "```python\nprint('hello')\n```";
      const result = formatMarkdown(input);
      expect(result).toMatch(/<pre class="[^"]*"><code class="[^"]*">/);
      expect(result).toContain("print('hello')");
    });

    it("includes the language class", () => {
      const input = "```javascript\nconst x = 1;\n```";
      const result = formatMarkdown(input);
      expect(result).toContain('class="language-javascript');
    });
  });

  describe("lists", () => {
    it("converts ordered lists", () => {
      const input = "1. First\n2. Second\n3. Third";
      const result = formatMarkdown(input);
      expect(result).toMatch(/<ol class="[^"]*">/);
      expect(result).toMatch(/<li class="[^"]*">First<\/li>/);
      expect(result).toMatch(/<li class="[^"]*">Third<\/li>/);
    });

    it("converts unordered lists", () => {
      const input = "- Apple\n- Banana\n- Cherry";
      const result = formatMarkdown(input);
      expect(result).toMatch(/<ul class="[^"]*">/);
      expect(result).toMatch(/<li class="[^"]*">Apple<\/li>/);
    });
  });

  describe("tables", () => {
    it("converts markdown tables", () => {
      const input = "| Name | Value |\n| --- | --- |\n| A | 1 |";
      const result = formatMarkdown(input);
      expect(result).toMatch(/<table class="[^"]*">/);
      expect(result).toMatch(/<th class="[^"]*">Name<\/th>/);
      expect(result).toMatch(/<td class="[^"]*">A<\/td>/);
      expect(result).toMatch(/<td class="[^"]*">1<\/td>/);
    });
  });

  describe("paragraphs", () => {
    it("wraps plain text in p tags", () => {
      const result = formatMarkdown("Hello world");
      expect(result).toMatch(/<p class="[^"]*">Hello world<\/p>/);
    });

    it("does not double-wrap HTML elements", () => {
      const result = formatMarkdown("# Header");
      expect(result).not.toMatch(/<p[^>]*><h1/);
    });
  });

  describe("LaTeX formulas", () => {
    it("converts inline LaTeX", () => {
      const result = formatMarkdown("$O(n^2)$");
      expect(result).toMatch(/<span style="[^"]*Courier New[^"]*">/);
      expect(result).toContain("O(n^2)");
    });
  });
});
