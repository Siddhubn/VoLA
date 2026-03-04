import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/postgresql';

// Inline curriculum data to avoid import issues
const CURRICULUM_MODULES = {
  TT: [
    { moduleNumber: 1, moduleName: 'Safety Practice and Hand Tools', topics: ['Organization of ITIs and the scope of the electrician trade', 'Safety rules, safety signs, and hazard identification'] },
    { moduleNumber: 2, moduleName: 'Wires, Joints, Soldering, and U.G.Cables', topics: ['Fundamentals of electricity, conductors, insulators, wire size measurement, and crimping'] },
    { moduleNumber: 3, moduleName: 'Basic Electrical Practice', topics: ["Ohm's law, simple electrical circuits, and related calculations"] },
    { moduleNumber: 4, moduleName: 'Magnetism and Capacitors', topics: ['Magnetic terms, magnetic materials, and the properties of magnets'] },
    { moduleNumber: 5, moduleName: 'AC Circuits', topics: ['Alternating current terms, definitions, and drawing vector diagrams'] },
    { moduleNumber: 6, moduleName: 'Cells and Batteries', topics: ['Differences and applications of primary cells and secondary cells'] },
    { moduleNumber: 7, moduleName: 'Basic Wiring Practice', topics: ['Bureau of Indian Standards (B.I.S.) symbols used for electrical accessories'] },
    { moduleNumber: 8, moduleName: 'Wiring Installation and Earthing', topics: ['Installing main boards equipped with MCB, DB switches, and fuse boxes'] },
    { moduleNumber: 9, moduleName: 'Illumination', topics: ['Illumination terminology and laws'] },
    { moduleNumber: 10, moduleName: 'Measuring Instruments', topics: ['Classification of instruments, scales, required forces, and Moving Coil (MC) / Moving Iron (MI) meters'] },
    { moduleNumber: 11, moduleName: 'Domestic Appliances', topics: ['The concepts of Neutral and Earth applied to cooking ranges'] },
    { moduleNumber: 12, moduleName: 'Transformers', topics: ['Transformer working principles, classifications, and EMF equations'] }
  ],
  TP: [
    { moduleNumber: 1, moduleName: 'Safety Practice and Hand Tools', topics: ['Visit various sections of the institute and locations of electrical installations'] },
    { moduleNumber: 2, moduleName: 'Wires, Joints, Soldering - U.G.Cables', topics: ['Prepare cable terminations, practice skinning, twisting, and crimping'] },
    { moduleNumber: 3, moduleName: 'Basic Electrical Practice', topics: ["Measure parameters in combinational circuits by applying Ohm's Law and analyzing graphs"] },
    { moduleNumber: 4, moduleName: 'Magnetism and Capacitors', topics: ['Determine the poles and plot the field of a bar magnet'] },
    { moduleNumber: 5, moduleName: 'AC Circuits', topics: ['Determine the characteristics of R-L, R-C, and R-L-C in AC series and parallel circuits'] },
    { moduleNumber: 6, moduleName: 'Cells and Batteries / Solar Cells', topics: ['Use and group various types of cells for specified voltages and currents'] },
    { moduleNumber: 7, moduleName: 'Basic Wiring Practice', topics: ['Identify conduits, electrical accessories, and practice cutting/threading conduits'] },
    { moduleNumber: 8, moduleName: 'Wiring Installation and Earthing', topics: ['Wire up consumer main boards with MCB, DB, switch, and fuse boxes'] },
    { moduleNumber: 9, moduleName: 'Illumination', topics: ['Install light fittings with reflectors for direct and indirect lighting'] },
    { moduleNumber: 10, moduleName: 'Measuring Instruments', topics: ['Practice using analog/digital instruments in single and 3-phase circuits (multimeter, wattmeter, frequency meter, etc.)'] },
    { moduleNumber: 11, moduleName: 'Domestic Appliances', topics: ['Dismantle and assemble electrical parts of cooking ranges, geysers, washing machines, and pump sets'] },
    { moduleNumber: 12, moduleName: 'Transformers', topics: ['Verify terminals, identify components, and calculate transformation ratios for single-phase transformers'] }
  ]
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ course: string }> }
) {
  try {
    const { course } = await params;
    const { searchParams } = new URL(request.url);
    const tradeType = searchParams.get('tradeType') || 'trade_theory';

    // Convert tradeType to TT/TP format
    const ttType = tradeType === 'trade_theory' ? 'TT' : 'TP';

    console.log(`📚 Fetching syllabus for ${course}, trade type: ${ttType}`);

    // Try to get modules from the knowledge base first
    const result = await query(`
      SELECT 
        module_id,
        module_name,
        module_number,
        array_agg(DISTINCT section_title ORDER BY section_title) FILTER (WHERE section_title IS NOT NULL) as topics,
        COUNT(*) as chunk_count
      FROM knowledge_chunks
      WHERE trade = $1
        AND trade_type = $2
      GROUP BY module_id, module_name, module_number
      ORDER BY module_number ASC
    `, [course, ttType]);

    let modules;
    let source = 'database';

    if (result.rows.length === 0) {
      console.log(`⚠️ No modules found in database for ${course} ${ttType}, using curriculum data`);
      
      // Fallback to inline curriculum data
      const curriculumModules = CURRICULUM_MODULES[ttType as 'TT' | 'TP'];
      modules = curriculumModules.map((module) => ({
        id: `module-${module.moduleNumber}`,
        name: module.moduleName,
        moduleNumber: module.moduleNumber,
        topics: module.topics,
        chunkCount: 0
      }));
      source = 'curriculum';
    } else {
      // Format modules from database
      modules = result.rows.map((row: any) => ({
        id: row.module_id,
        name: row.module_name,
        moduleNumber: row.module_number,
        topics: row.topics || [],
        chunkCount: parseInt(row.chunk_count)
      }));
    }

    console.log(`✅ Found ${modules.length} modules from ${source} with ${modules.reduce((sum: number, m: any) => sum + m.topics.length, 0)} total topics`);

    return NextResponse.json({
      success: true,
      course,
      tradeType: ttType,
      modules,
      source
    });

  } catch (error: any) {
    console.error('❌ Error fetching syllabus:', error);
    
    // Last resort fallback to inline curriculum data
    try {
      const tradeType = new URL(request.url).searchParams.get('tradeType') || 'trade_theory';
      const ttType = tradeType === 'trade_theory' ? 'TT' : 'TP';
      const curriculumModules = CURRICULUM_MODULES[ttType as 'TT' | 'TP'];
      
      const modules = curriculumModules.map((module) => ({
        id: `module-${module.moduleNumber}`,
        name: module.moduleName,
        moduleNumber: module.moduleNumber,
        topics: module.topics,
        chunkCount: 0
      }));

      console.log(`✅ Fallback: Using curriculum data with ${modules.length} modules`);

      return NextResponse.json({
        success: true,
        course: await params.then(p => p.course),
        tradeType: ttType,
        modules,
        source: 'curriculum-fallback'
      });
    } catch (fallbackError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to fetch syllabus',
          details: error.message 
        },
        { status: 500 }
      );
    }
  }
}
