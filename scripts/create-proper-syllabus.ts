#!/usr/bin/env tsx
/**
 * Create proper module syllabus with correct topics
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

// Electrician Trade Theory Syllabus
const ELECTRICIAN_TT_SYLLABUS = [
  {
    module_number: 1,
    module_id: 'module-1',
    module_name: 'Safety Practice and Hand Tools',
    hours: 40,
    trade_type: 'trade_theory',
    topics: [
      'Organization of ITIs and the scope of the electrician trade',
      'Safety rules, safety signs, and hazard identification',
      'Types of fires and the use of fire extinguishers',
      'Rescue operations, first aid treatment, and artificial respiration',
      'Procedures for the disposal of waste material',
      'Usage of Personal Protective Equipment (PPE)',
      'Guidelines for workshop cleanliness and maintenance',
      'Trade hand tools: specifications, standards, NEC Code 2011, and lifting heavy loads'
    ]
  },
  {
    module_number: 2,
    module_id: 'module-2',
    module_name: 'Wires, Joints, Soldering, and U.G.Cables',
    hours: 95,
    trade_type: 'trade_theory',
    topics: [
      'Fundamentals of electricity, conductors, insulators, wire size measurement, and crimping',
      'Various types of wire joints and soldering methods',
      'Underground (UG) cables: construction details, materials, joints, and testing'
    ]
  },
  {
    module_number: 3,
    module_id: 'module-3',
    module_name: 'Basic Electrical Practice',
    hours: 51,
    trade_type: 'trade_theory',
    topics: [
      'Ohm\'s law, simple electrical circuits, and related calculations',
      'Kirchhoff\'s law and its practical applications',
      'DC series and parallel circuits',
      'Effects of open and short circuits in series and parallel networks',
      'Laws of resistance and understanding various types of resistors',
      'Wheatstone bridge principle and its applications',
      'The effect of temperature variations on electrical resistance',
      'Complex series and parallel combination circuits'
    ]
  },
  {
    module_number: 4,
    module_id: 'module-4',
    module_name: 'Magnetism and Capacitors',
    hours: 32,
    trade_type: 'trade_theory',
    topics: [
      'Magnetic terms, magnetic materials, and the properties of magnets',
      'Principles and fundamental laws of electromagnetism',
      'Magnetic circuits, including self and mutually induced electromotive forces (EMFs)',
      'Capacitors: classifications, functions, grouping, and uses'
    ]
  },
  {
    module_number: 5,
    module_id: 'module-5',
    module_name: 'AC Circuits',
    hours: 77,
    trade_type: 'trade_theory',
    topics: [
      'Alternating current terms, definitions, and drawing vector diagrams',
      'Characteristics of series resonance circuits',
      'R-L, R-C, and R-L-C parallel circuits',
      'Characteristics of parallel resonance circuits',
      'Power, energy, and power factor in AC single-phase systems',
      'Understanding the power factor and methods for improvement',
      'Fundamentals of 3-Phase AC systems'
    ]
  },
  {
    module_number: 6,
    module_id: 'module-6',
    module_name: 'Cells and Batteries',
    hours: 50,
    trade_type: 'trade_theory',
    topics: [
      'Differences and applications of primary cells and secondary cells',
      'Techniques for grouping cells',
      'Battery charging methods and the operation of battery chargers',
      'Routine care and maintenance of batteries',
      'Operation and application of solar cells'
    ]
  },
  {
    module_number: 7,
    module_id: 'module-7',
    module_name: 'Basic Wiring Practice',
    hours: 110,
    trade_type: 'trade_theory',
    topics: [
      'Bureau of Indian Standards (B.I.S.) symbols used for electrical accessories',
      'Principles and planning for laying out domestic wiring',
      'Test boards, extension boards, and cable color coding',
      'Special wiring circuits, including tunnel, corridor, godown, and hostel wiring'
    ]
  },
  {
    module_number: 8,
    module_id: 'module-8',
    module_name: 'Wiring Installation and Earthing',
    hours: 115,
    trade_type: 'trade_theory',
    topics: [
      'Installing main boards equipped with MCB, DB switches, and fuse boxes',
      'National Electrical (NE) code of practice and IE Rules regarding mounting energy meter boards',
      'Estimating load, cable size, bill of materials, and the cost for wiring installations',
      'Testing domestic wiring installations, locating faults, and applying remedies',
      'Earthing systems: types, terminology, Megger, and using Earth Resistance Testers'
    ]
  },
  {
    module_number: 9,
    module_id: 'module-9',
    module_name: 'Illumination',
    hours: 45,
    trade_type: 'trade_theory',
    topics: [
      'Illumination terminology and laws',
      'Low voltage lamps and configuring different wattage lamps in series',
      'Construction details of various types of lamps',
      'Lighting setups for decoration, serial set design, and flashers',
      'Showcase lights, fittings, and calculations for lumen efficiency'
    ]
  },
  {
    module_number: 10,
    module_id: 'module-10',
    module_name: 'Measuring Instruments',
    hours: 75,
    trade_type: 'trade_theory',
    topics: [
      'Classification of instruments, scales, required forces, and Moving Coil (MC) / Moving Iron (MI) meters',
      'Working principles and use of single and 3-phase wattmeters',
      'Operating a Tong-tester (clamp-on ammeter)',
      'Smart meters, automatic meter reading infrastructure, and supply requirements',
      'Extending the range of MC voltmeters, analyzing loading effects, and voltage drop effects'
    ]
  },
  {
    module_number: 11,
    module_id: 'module-11',
    module_name: 'Domestic Appliances',
    hours: 75,
    trade_type: 'trade_theory',
    topics: [
      'The concepts of Neutral and Earth applied to cooking ranges',
      'Maintenance of heating elements, immersion heaters, electric stoves, and hot plates',
      'Servicing food mixers',
      'Dismantling, repairing, and servicing additional appliances like electric irons, kettles, induction heaters, ovens, and washing machines'
    ]
  },
  {
    module_number: 12,
    module_id: 'module-12',
    module_name: 'Transformers',
    hours: 75,
    trade_type: 'trade_theory',
    topics: [
      'Transformer working principles, classifications, and EMF equations',
      'Understanding transformer losses, Open Circuit (OC) / Short Circuit (SC) tests, efficiency calculations, and voltage regulation',
      'Executing the parallel operation of two single-phase transformers',
      'Three-phase transformer connections (star, delta)',
      'Methods of cooling transformers and testing transformer oil',
      'Winding small transformers using a winding machine',
      'General maintenance practices for three-phase transformers',
      'Final project work implementation'
    ]
  }
];

// Electrician Trade Practical Syllabus
const ELECTRICIAN_TP_SYLLABUS = [
  {
    module_number: 1,
    module_id: 'module-1',
    module_name: 'Safety Practice and Hand Tools',
    hours: 40,
    trade_type: 'trade_practical',
    topics: [
      'Visit various sections of the institute and locations of electrical installations',
      'Identify safety symbols, hazards, and practice preventive measures for electrical accidents',
      'Practice safe methods of fire fighting and the use of fire extinguishers',
      'Perform elementary first aid, rescue operations, and artificial respiration',
      'Understand the disposal procedures for waste materials and the use of personal protective equipment (PPE)',
      'Maintain workshop cleanliness and perform safe lifting/handling of tools',
      'Identify, care for, and maintain trade tools, including allied tools, filing, and hacksawing'
    ]
  },
  {
    module_number: 2,
    module_id: 'module-2',
    module_name: 'Wires, Joints, Soldering - U.G.Cables',
    hours: 95,
    trade_type: 'trade_practical',
    topics: [
      'Prepare cable terminations, practice skinning, twisting, and crimping',
      'Identify various cable types and measure conductor size using SWG and a micrometer',
      'Make simple twist, married, Tee, western union, britannia, and rat tail joints',
      'Practice soldering of joints and lugs',
      'Identify parts of underground (UG) cables, perform skinning, dressing, and make straight joints',
      'Test insulation resistance using a megger and check for cable faults'
    ]
  },
  {
    module_number: 3,
    module_id: 'module-3',
    module_name: 'Basic Electrical Practice',
    hours: 51,
    trade_type: 'trade_practical',
    topics: [
      'Measure parameters in combinational circuits by applying Ohm\'s Law and analyzing graphs',
      'Measure current and voltage to verify Kirchhoff\'s Law and the laws of series/parallel circuits',
      'Analyze the effects of short and open faults in series and parallel circuits',
      'Measure resistance using the voltage drop method and the Wheatstone bridge',
      'Determine the thermal effect of electric current and changes in resistance due to temperature'
    ]
  },
  {
    module_number: 4,
    module_id: 'module-4',
    module_name: 'Magnetism and Capacitors',
    hours: 32,
    trade_type: 'trade_practical',
    topics: [
      'Determine the poles and plot the field of a bar magnet',
      'Wind a solenoid and determine the magnetic effect of electric current',
      'Determine the direction of induced EMF, current, and mutually induced EMF',
      'Measure the resistance, impedance, and inductance of choke coils',
      'Identify, group, charge, discharge, and test various types of capacitors'
    ]
  },
  {
    module_number: 5,
    module_id: 'module-5',
    module_name: 'AC Circuits',
    hours: 77,
    trade_type: 'trade_practical',
    topics: [
      'Determine the characteristics of R-L, R-C, and R-L-C in AC series and parallel circuits',
      'Measure resonance frequency in AC series and parallel circuits',
      'Measure power, energy, and Power Factor (PF) for single and 3-phase circuits',
      'Practice improving the power factor using capacitors in a 3-phase circuit',
      'Ascertain the use of a neutral wire, phase sequences, and the relationship between line and phase values for star/delta connections',
      'Determine power for balanced/unbalanced loads and analyze phase short-circuits'
    ]
  },
  {
    module_number: 6,
    module_id: 'module-6',
    module_name: 'Cells and Batteries / Solar Cells',
    hours: 50,
    trade_type: 'trade_practical',
    topics: [
      'Use and group various types of cells for specified voltages and currents',
      'Prepare and practice battery charging and detail the charging circuit',
      'Practice routine care, maintenance, and testing of batteries',
      'Determine the number of solar cells in series/parallel for a given power requirement'
    ]
  },
  {
    module_number: 7,
    module_id: 'module-7',
    module_name: 'Basic Wiring Practice',
    hours: 110,
    trade_type: 'trade_practical',
    topics: [
      'Identify conduits, electrical accessories, and practice cutting/threading conduits',
      'Prepare test/extension boards and mount accessories like lamp holders, switches, sockets, and MCBs',
      'Draw layouts and practice PVC casing-capping and conduit wiring',
      'Wire up PVC conduits to control lamps from multiple different places and in various switching combinations'
    ]
  },
  {
    module_number: 8,
    module_id: 'module-8',
    module_name: 'Wiring Installation and Earthing',
    hours: 115,
    trade_type: 'trade_practical',
    topics: [
      'Wire up consumer main boards with MCB, DB, switch, and fuse boxes',
      'Prepare and mount energy meter boards',
      'Estimate costs and bills of material for wiring residential buildings and workshops',
      'Practice domestic and industrial wiring as per IE rules, including testing and fault detection',
      'Prepare pipe and plate earthing and measure earth resistance using an earth tester/megger',
      'Test earth leakage using ELCB and relays'
    ]
  },
  {
    module_number: 9,
    module_id: 'module-9',
    module_name: 'Illumination',
    hours: 45,
    trade_type: 'trade_practical',
    topics: [
      'Install light fittings with reflectors for direct and indirect lighting',
      'Group different wattage lamps in series',
      'Practice the installation of various lamps (e.g., fluorescent, mercury vapour, sodium vapour, metal halide)',
      'Prepare decorative lamp circuits (rotating/running effects) and showcase lighting'
    ]
  },
  {
    module_number: 10,
    module_id: 'module-10',
    module_name: 'Measuring Instruments',
    hours: 75,
    trade_type: 'trade_practical',
    topics: [
      'Practice using analog/digital instruments in single and 3-phase circuits (multimeter, wattmeter, frequency meter, etc.)',
      'Measure 3-phase power using the two-wattmeter method and verify power factor meter readings',
      'Measure electrical parameters using a tong tester in 3-phase circuits',
      'Demonstrate, perform readings on, install, and diagnose smart meters',
      'Extend instrument ranges, perform calibrations, and determine testing errors'
    ]
  },
  {
    module_number: 11,
    module_id: 'module-11',
    module_name: 'Domestic Appliances',
    hours: 75,
    trade_type: 'trade_practical',
    topics: [
      'Dismantle and assemble electrical parts of cooking ranges, geysers, washing machines, and pump sets',
      'Service and repair electric irons, electric kettles, cooking ranges, and geysers',
      'Service and repair induction heaters, ovens, mixers, grinders, and washing machines'
    ]
  },
  {
    module_number: 12,
    module_id: 'module-12',
    module_name: 'Transformers',
    hours: 75,
    trade_type: 'trade_practical',
    topics: [
      'Verify terminals, identify components, and calculate transformation ratios for single-phase transformers',
      'Perform open/short circuit tests and determine voltage regulation at different loads',
      'Perform series and parallel operations of single-phase transformers',
      'Perform 3-phase operations (delta-delta, delta-star, star-star, star-delta)',
      'Test transformer oil, practice winding small transformers, and carry out general maintenance'
    ]
  }
];

async function createProperSyllabus() {
  console.log('🔧 Creating proper module syllabus with correct topics...\n');
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }
  
  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to Neon DB\n');

    // Create module_syllabus table
    console.log('📝 Creating module_syllabus table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS module_syllabus (
        id SERIAL PRIMARY KEY,
        course VARCHAR(50) NOT NULL,
        module_id VARCHAR(50) NOT NULL,
        module_name VARCHAR(255) NOT NULL,
        module_number INTEGER,
        hours INTEGER,
        trade_type VARCHAR(50),
        topics TEXT[],
        extracted_from VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(course, module_id, trade_type)
      )
    `);
    console.log('   ✅ Table created\n');

    // Clear existing data
    console.log('🗑️  Clearing existing syllabus data...');
    await client.query('DELETE FROM module_syllabus WHERE course = $1', ['electrician']);
    console.log('   ✅ Cleared\n');

    // Insert Trade Theory syllabus
    console.log('📚 Inserting Trade Theory syllabus...\n');
    for (const module of ELECTRICIAN_TT_SYLLABUS) {
      await client.query(`
        INSERT INTO module_syllabus 
        (course, module_id, module_name, module_number, hours, trade_type, topics, extracted_from)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        'electrician',
        module.module_id,
        module.module_name,
        module.module_number,
        module.hours,
        module.trade_type,
        module.topics,
        'manual_entry'
      ]);
      console.log(`   ✅ ${module.module_id}: ${module.module_name} (${module.topics.length} topics)`);
    }

    // Insert Trade Practical syllabus
    console.log('\n📚 Inserting Trade Practical syllabus...\n');
    for (const module of ELECTRICIAN_TP_SYLLABUS) {
      await client.query(`
        INSERT INTO module_syllabus 
        (course, module_id, module_name, module_number, hours, trade_type, topics, extracted_from)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        'electrician',
        module.module_id,
        module.module_name,
        module.module_number,
        module.hours,
        module.trade_type,
        module.topics,
        'manual_entry'
      ]);
      console.log(`   ✅ ${module.module_id}: ${module.module_name} (${module.topics.length} topics)`);
    }

    console.log('\n🎉 Proper syllabus created successfully!\n');

    // Verify
    console.log('🔍 Verifying syllabus...\n');
    const verification = await client.query(`
      SELECT 
        module_id,
        module_name,
        trade_type,
        array_length(topics, 1) as topic_count
      FROM module_syllabus
      WHERE course = 'electrician'
      ORDER BY trade_type, module_number
    `);
    
    console.log(`Total modules: ${verification.rows.length}\n`);
    let currentTradeType = '';
    verification.rows.forEach((row: any) => {
      if (row.trade_type !== currentTradeType) {
        currentTradeType = row.trade_type;
        console.log(`\n${currentTradeType.toUpperCase()}:`);
        console.log('─'.repeat(60));
      }
      console.log(`  ${row.module_id}: ${row.module_name} (${row.topic_count} topics)`);
    });

    console.log('\n✅ Syllabus is ready!');
    console.log('\n📋 Next step: Redeploy Vercel to see the correct modules and topics\n');

    client.release();
    await pool.end();
    
  } catch (error: any) {
    console.error('\n❌ Failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

createProperSyllabus();
