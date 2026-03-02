import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

interface IndexEntry {
  text: string;
  level: number;  // 0 = module, 1 = topic, 2 = subtopic
  pageNumber?: number;
  isModuleHeader: boolean;
}

export interface ModuleStructure {
  moduleName: string;
  moduleNumber?: number;
  topics: string[];
}

export class IndexExtractor {
  /**
   * Check if a page is likely an index/table of contents page
   */
  isIndexPage(pageText: string, pageNumber: number): boolean {
    // Only check first 15 pages
    if (pageNumber > 15) {
      return false;
    }

    const lowerText = pageText.toLowerCase();
    
    // Check for index keywords
    const hasIndexKeywords = 
      lowerText.includes('contents') ||
      lowerText.includes('index') ||
      lowerText.includes('table of contents') ||
      lowerText.includes('syllabus');

    // Check for module patterns
    const hasModules = /module\s+\d+:/i.test(pageText);
    
    // Check for lesson number patterns (1.1.01, 1.2.17, etc.)
    const lessonPattern = /\d+\.\d+\.\d+/g;
    const lessonMatches = pageText.match(lessonPattern);
    const hasLessons = lessonMatches && lessonMatches.length >= 3;

    return Boolean(hasIndexKeywords && (hasModules || hasLessons));
  }

  /**
   * Extract index entries from a page
   */
  extractIndexEntries(pageText: string): IndexEntry[] {
    const entries: IndexEntry[] = [];
    
    // Split by common separators and newlines
    const lines = pageText
      .split(/\n|(?=Module \d+:)|(?=\d+\.\d+\.\d+)/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line || line.length < 3) {
        continue;
      }

      const entry = this.parseIndexLine(line);
      if (entry) {
        entries.push(entry);
      }
    }

    return entries;
  }

  /**
   * Parse a single index line into structured data
   */
  parseIndexLine(line: string): IndexEntry | null {
    // Skip lines that are just page numbers or very short
    if (/^\d+$/.test(line) || line.length < 5) {
      return null;
    }

    // Skip lines that look like headers (Contents, Index, etc.)
    const lowerLine = line.toLowerCase();
    if (
      lowerLine === 'contents' ||
      lowerLine === 'index' ||
      lowerLine === 'table of contents' ||
      lowerLine === 'syllabus' ||
      lowerLine.includes('lesson no') ||
      lowerLine.includes('title of') ||
      lowerLine.includes('learning outcome') ||
      lowerLine.includes('page. no')
    ) {
      return null;
    }

    // Check if it's a module header (starts with "Module X:")
    const moduleMatch = line.match(/^Module\s+(\d+):\s*(.+)/i);
    if (moduleMatch) {
      return {
        text: moduleMatch[2].trim(),
        level: 0,
        isModuleHeader: true
      };
    }

    // Check if it's a lesson entry (format: 1.1.01 or similar)
    const lessonMatch = line.match(/^(\d+\.\d+\.\d+(?:\s*&\s*\d+\.\d+\.\d+)?)\s+(.+?)(?:\s+[>)}\]]\s*)?(?:\s+\(QR Code[^)]*\)\s*\*?\s*)?(?:\s+[.,;]\s*)?(?:\s+\d+\s*)?$/i);
    if (lessonMatch) {
      const topicText = lessonMatch[2].trim();
      
      // Extract page number if at the end
      const pageMatch = topicText.match(/\s+(\d+)\s*$/);
      const pageNumber = pageMatch ? parseInt(pageMatch[1]) : undefined;
      
      let cleanText = topicText;
      if (pageMatch) {
        cleanText = topicText.substring(0, pageMatch.index).trim();
      }

      return {
        text: cleanText,
        level: 1,
        pageNumber,
        isModuleHeader: false
      };
    }

    return null;
  }

  /**
   * Clean formatting artifacts from topic names
   */
  cleanTopicName(rawName: string): string {
    let cleaned = rawName;

    // Remove dot leaders
    cleaned = cleaned.replace(/\.{2,}/g, '');
    
    // Remove dash leaders
    cleaned = cleaned.replace(/[-–—]{2,}/g, '');
    
    // Remove ellipsis
    cleaned = cleaned.replace(/…+/g, '');
    
    // Remove page numbers at the end
    cleaned = cleaned.replace(/\s+\d+\s*$/g, '');
    
    // Remove QR code references
    cleaned = cleaned.replace(/\(QR Code[^)]*\)/gi, '');
    cleaned = cleaned.replace(/QR Code[^.]*\./gi, '');
    
    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Remove leading/trailing special characters
    cleaned = cleaned.replace(/^[•\-*]+\s*/, '');
    cleaned = cleaned.replace(/\s*[•\-*]+$/, '');

    return cleaned;
  }

  /**
   * Build hierarchical module structure from flat entries
   */
  buildModuleStructure(entries: IndexEntry[]): ModuleStructure[] {
    const modules: ModuleStructure[] = [];
    let currentModule: ModuleStructure | null = null;

    for (const entry of entries) {
      const cleanedText = this.cleanTopicName(entry.text);
      
      if (!cleanedText || cleanedText.length < 2) {
        continue;
      }

      if (entry.isModuleHeader || entry.level === 0) {
        // Start a new module
        const moduleNumberMatch = cleanedText.match(/(?:MODULE|UNIT)\s+(\d+)/i);
        const moduleNumber = moduleNumberMatch ? parseInt(moduleNumberMatch[1]) : undefined;

        currentModule = {
          moduleName: cleanedText,
          moduleNumber,
          topics: []
        };
        modules.push(currentModule);
      } else if (currentModule && entry.level > 0) {
        // Add topic to current module
        currentModule.topics.push(cleanedText);
      }
    }

    return modules;
  }

  /**
   * Extract syllabus structure from a PDF file
   */
  async extractFromPDF(pdfPath: string): Promise<ModuleStructure[]> {
    try {
      const loadingTask = pdfjsLib.getDocument(pdfPath);
      const pdf = await loadingTask.promise;

      const allEntries: IndexEntry[] = [];
      const maxPages = Math.min(15, pdf.numPages);

      console.log(`  📄 Scanning first ${maxPages} pages for index...`);

      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Preserve line breaks by checking Y positions
        const items = textContent.items as any[];
        let pageText = '';
        let lastY = -1;
        
        for (const item of items) {
          if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
            pageText += '\n';
          }
          pageText += item.str + ' ';
          lastY = item.transform[5];
        }

        if (this.isIndexPage(pageText, pageNum)) {
          console.log(`  ✓ Found index on page ${pageNum}`);
          const entries = this.extractIndexEntries(pageText);
          allEntries.push(...entries);
        }
      }

      if (allEntries.length === 0) {
        console.log('  ⚠️  No index found in first 15 pages');
        return [];
      }

      const modules = this.buildModuleStructure(allEntries);
      console.log(`  ✓ Extracted ${modules.length} modules with ${allEntries.length} total entries`);

      return modules;
    } catch (error) {
      console.error('  ❌ Error extracting index:', (error as Error).message);
      return [];
    }
  }
}
