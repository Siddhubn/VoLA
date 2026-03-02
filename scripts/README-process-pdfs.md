# PDF Batch Processing Script

This script processes all PDFs in the `fitter/` and `electrician/` folders through the RAG (Retrieval-Augmented Generation) pipeline, extracting content, generating embeddings, and storing them in the vector database.

## Prerequisites

1. **Environment Setup**: Ensure `GEMINI_API_KEY` is set in your `.env.local` file
2. **Database**: PostgreSQL with pgvector extension must be running and initialized
3. **Dependencies**: Run `npm install` to install required packages including `tsx`

## Usage

### Quick Start

```bash
# Process all PDFs with default settings
npm run process-pdfs

# Dry run to see what would be processed
npm run process-pdfs:dry-run

# Process with detailed progress and save report
npm run process-pdfs:verbose
```

### Advanced Usage

```bash
# Process only fitter course PDFs
npx tsx scripts/process-pdfs.ts --course fitter

# Custom chunk size and batch settings
npx tsx scripts/process-pdfs.ts --chunk-size 1000 --batch-size 25 --concurrent 1

# Process with custom settings and save detailed report
npx tsx scripts/process-pdfs.ts \
  --chunk-size 500 \
  --chunk-overlap 50 \
  --batch-size 100 \
  --concurrent 3 \
  --verbose \
  --report-file "reports/processing-$(date +%Y%m%d-%H%M%S).json"
```

## Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--chunk-size <number>` | Size of text chunks in tokens | 750 |
| `--chunk-overlap <number>` | Overlap between consecutive chunks | 100 |
| `--batch-size <number>` | Number of embeddings to generate per API call | 50 |
| `--concurrent <number>` | Maximum number of files to process simultaneously | 2 |
| `--course <fitter\|electrician>` | Process only specific course | Both courses |
| `--dry-run` | Show what would be processed without processing | false |
| `--report-file <path>` | Save detailed JSON report to file | No report |
| `--verbose` | Show detailed progress information | false |
| `--help` | Show help message | - |

## Output

### Console Output

The script provides real-time progress information:

- **File Discovery**: Lists all PDF files found
- **Configuration**: Shows processing parameters
- **Progress Tracking**: 
  - Simple mode: Overall progress with success/failure counts
  - Verbose mode: Detailed per-file progress with stages
- **Final Summary**: Success rate, timing, and statistics

### Progress Stages

1. **Extraction**: Extracting text from PDF
2. **Chunking**: Breaking content into chunks
3. **Embedding**: Generating vector embeddings via Gemini API
4. **Storage**: Storing chunks and embeddings in database
5. **Complete**: Processing finished successfully

### Report Files

When using `--report-file`, two files are generated:

1. **JSON Report** (`*.json`): Detailed machine-readable report with:
   - Processing metadata and configuration
   - Per-file results and statistics
   - Module distribution and token counts
   - Error details for failed files

2. **Summary Report** (`*-summary.txt`): Human-readable summary with:
   - Processing overview and timing
   - Success/failure statistics
   - Module distribution
   - Error list

## Example Output

```
🚀 PDF Batch Processing CLI

📁 Discovering PDF files...

Found 4 PDF files:
  • fitter/Fitter - 1st Year - TP (NSQF 2022).pdf (2.1 MB)
  • fitter/Fitter - 1st Year - TT (NSQF 2022).pdf (1.8 MB)
  • electrician/Electrician - 1st year - TP (NSQF 2022).pdf (2.3 MB)
  • electrician/Electrician - 1st year - TT (NSQF 2022).pdf (1.9 MB)

Configuration:
  Chunk Size: 750 tokens
  Chunk Overlap: 100 tokens
  Embedding Batch Size: 50
  Max Concurrent Files: 2
  Verbose Mode: enabled

🔄 Starting batch processing...

✅ Completed: Fitter - 1st Year - TP (NSQF 2022).pdf
✅ Completed: Fitter - 1st Year - TT (NSQF 2022).pdf
✅ Completed: Electrician - 1st year - TP (NSQF 2022).pdf
✅ Completed: Electrician - 1st year - TT (NSQF 2022).pdf

📊 Processing Complete!

✅ Successful: 4
❌ Failed: 0
⏱️ Total Time: 8m 32s
📈 Success Rate: 100.0%
```

## Error Handling

The script includes robust error handling:

- **API Failures**: Automatic retry with exponential backoff
- **File Errors**: Individual file failures don't stop batch processing
- **Database Errors**: Detailed error logging and graceful degradation
- **Interruption**: Handles Ctrl+C gracefully

## Performance Considerations

- **Concurrent Processing**: Limited to prevent API rate limiting
- **Batch Size**: Optimized for Gemini API efficiency
- **Memory Usage**: Processes files sequentially to manage memory
- **Rate Limiting**: Built-in delays between API calls

## Troubleshooting

### Common Issues

1. **Missing API Key**: Ensure `GEMINI_API_KEY` is set in `.env.local`
2. **Database Connection**: Verify PostgreSQL is running and accessible
3. **File Permissions**: Ensure script can read PDF files
4. **Memory Issues**: Reduce `--concurrent` and `--batch-size` for large files

### Debug Mode

Use `--verbose` flag to see detailed processing information and identify bottlenecks.

### Log Files

Check the console output for specific error messages. When using `--report-file`, detailed error information is saved to the report.

## Integration

This script integrates with the existing RAG system:

- Uses the same `PDFProcessingPipeline` as the web interface
- Stores data in the same database schema
- Compatible with existing quiz generation and chatbot features
- Follows the same chunking and embedding strategies