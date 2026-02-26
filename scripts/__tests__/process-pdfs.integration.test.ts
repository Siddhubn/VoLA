import { describe, it, expect } from 'vitest';
import { discoverPDFs } from '../process-pdfs';
import path from 'path';

describe('PDF Processing CLI Integration Tests', () => {
  it('should discover actual PDF files in the project', async () => {
    const baseDir = path.resolve(process.cwd());
    
    // Test discovering all PDFs
    const allFiles = await discoverPDFs(baseDir);
    
    // Should find 4 PDFs (2 fitter + 2 electrician)
    expect(allFiles.length).toBeGreaterThanOrEqual(4);
    
    // Check that we have both courses
    const fitterFiles = allFiles.filter(f => f.course === 'fitter');
    const electricianFiles = allFiles.filter(f => f.course === 'electrician');
    
    expect(fitterFiles.length).toBeGreaterThanOrEqual(2);
    expect(electricianFiles.length).toBeGreaterThanOrEqual(2);
    
    // Check that files have proper structure
    allFiles.forEach(file => {
      expect(file).toHaveProperty('path');
      expect(file).toHaveProperty('course');
      expect(file).toHaveProperty('filename');
      expect(file).toHaveProperty('size');
      expect(file).toHaveProperty('relativePath');
      expect(file.filename).toMatch(/\.pdf$/i);
      expect(['fitter', 'electrician']).toContain(file.course);
    });
  });

  it('should discover PDFs for specific course', async () => {
    const baseDir = path.resolve(process.cwd());
    
    // Test fitter course only
    const fitterFiles = await discoverPDFs(baseDir, 'fitter');
    expect(fitterFiles.every(f => f.course === 'fitter')).toBe(true);
    
    // Test electrician course only
    const electricianFiles = await discoverPDFs(baseDir, 'electrician');
    expect(electricianFiles.every(f => f.course === 'electrician')).toBe(true);
  });

  it('should detect syllabus types from filenames', async () => {
    const baseDir = path.resolve(process.cwd());
    const allFiles = await discoverPDFs(baseDir);
    
    // Check that we have both TP and TT files
    const tpFiles = allFiles.filter(f => f.filename.toLowerCase().includes('tp'));
    const ttFiles = allFiles.filter(f => f.filename.toLowerCase().includes('tt'));
    
    expect(tpFiles.length).toBeGreaterThan(0);
    expect(ttFiles.length).toBeGreaterThan(0);
    
    // Verify filename patterns
    tpFiles.forEach(file => {
      expect(file.filename.toLowerCase()).toMatch(/tp|trade practical/);
    });
    
    ttFiles.forEach(file => {
      expect(file.filename.toLowerCase()).toMatch(/tt|trade theory/);
    });
  });
});