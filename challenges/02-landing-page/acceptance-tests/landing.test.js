const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Load the HTML file
const htmlPath = path.join(__dirname, '..', 'index.html');
let dom;
let document;

beforeAll(() => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true });
  document = dom.window.document;
});

describe('Landing Page — Challenge 2', () => {

  describe('Hero Section', () => {
    test('1.1 包含 h1 标题', () => {
      const h1 = document.querySelector('h1');
      expect(h1).not.toBeNull();
      expect(h1.textContent.length).toBeGreaterThan(0);
    });

    test('1.2 包含副标题段落', () => {
      // Hero section should have at least one paragraph
      const paragraphs = document.querySelectorAll('p');
      expect(paragraphs.length).toBeGreaterThan(0);
    });

    test('1.3 包含 CTA 按钮', () => {
      const buttons = document.querySelectorAll('button, a.btn, input[type="submit"], [role="button"]');
      let hasCTA = false;
      buttons.forEach(btn => {
        const text = (btn.textContent || '').toLowerCase();
        if (text.includes('get started') || text.includes('sign up') || text.includes('try') || text.includes('开始') || text.includes('注册') || text.includes('免费') || text.includes('join')) {
          hasCTA = true;
        }
      });
      expect(hasCTA).toBe(true);
    });
  });

  describe('Features Section', () => {
    test('2.1 包含至少 3 个 feature 卡片', () => {
      const features = document.querySelectorAll('[class*="feature"], [class*="card"], section > div > div');
      // More robust: look for sections with at least 3 child containers
      const allSections = document.querySelectorAll('section');
      let hasFeatures = false;
      allSections.forEach(section => {
        const children = section.querySelectorAll(':scope > div > div, :scope > div');
        if (children.length >= 3) hasFeatures = true;
      });
      // Or check for grid/flex layouts with multiple items
      const gridItems = document.querySelectorAll('[class*="grid"] > *, [class*="flex"] > *');
      if (gridItems.length >= 3) hasFeatures = true;
      expect(hasFeatures).toBe(true);
    });
  });

  describe('Newsletter Form', () => {
    test('3.1 包含邮箱输入框', () => {
      const emailInput = document.querySelector('input[type="email"]');
      expect(emailInput).not.toBeNull();
    });

    test('3.2 包含提交按钮', () => {
      const form = document.querySelector('form');
      expect(form).not.toBeNull();
      const submitBtn = form.querySelector('button, input[type="submit"]');
      expect(submitBtn).not.toBeNull();
    });
  });

  describe('Testimonials', () => {
    test('6.1 包含至少 2 条评价', () => {
      const testimonials = document.querySelectorAll('[class*="testimonial"], [class*="review"], blockquote');
      if (testimonials.length >= 2) {
        expect(testimonials.length).toBeGreaterThanOrEqual(2);
      } else {
        // Check for a section with multiple quote-like blocks
        const sections = document.querySelectorAll('section');
        let hasTestimonials = false;
        sections.forEach(section => {
          const quotes = section.querySelectorAll('blockquote, [class*="quote"]');
          if (quotes.length >= 2) hasTestimonials = true;
          // Check for name + text pairs
          const texts = section.querySelectorAll('p');
          const names = section.querySelectorAll('h3, h4, h5, strong, [class*="name"], [class*="author"]');
          if (texts.length >= 2 && names.length >= 2) hasTestimonials = true;
        });
        expect(hasTestimonials).toBe(true);
      }
    });
  });

  describe('Footer', () => {
    test('7.1 包含 footer 元素', () => {
      const footer = document.querySelector('footer');
      expect(footer).not.toBeNull();
    });

    test('7.2 footer 包含版权信息', () => {
      const footer = document.querySelector('footer');
      const text = footer.textContent.toLowerCase();
      expect(text).toContain('©') || expect(text).toContain('copyright');
    });

    test('7.3 footer 包含至少 2 个链接', () => {
      const footer = document.querySelector('footer');
      const links = footer.querySelectorAll('a');
      expect(links.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Responsive', () => {
    test('8.1 包含 viewport meta 标签', () => {
      const viewport = document.querySelector('meta[name="viewport"]');
      expect(viewport).not.toBeNull();
      expect(viewport.getAttribute('content')).toContain('width=device-width');
    });
  });

  describe('Semantic HTML', () => {
    test('9.1 使用语义化标签', () => {
      expect(document.querySelector('header')).not.toBeNull();
      expect(document.querySelector('main')).not.toBeNull();
      expect(document.querySelector('footer')).not.toBeNull();
    });
  });
});
