#!/usr/bin/env tsx
import { config } from 'dotenv';
import path from 'path';
import { SyllabusStructureStorage } from '../lib/rag/syllabus-storage';
import { ModuleStructure } from '../lib/rag/index-extractor';

config({ path: path.join(process.cwd(), '.env.local') });

const electricianTT: ModuleStructure[] = [
  {
    moduleName: "Safety Practice and Hand Tools",
    moduleNumber: 1,
    topics: [
      "Organization of ITIs and the scope of the electrician trade",
      "Safety rules, safety signs, and hazard identification",
      "Types of fires and the use of fire extinguishers",
      "Rescue operations, first aid treatment, and artificial respiration",
      "Procedures for the disposal of waste material",
      "Usage of Personal Protective Equipment (PPE)",
      "Guidelines for workshop cleanliness and maintenance",
      "Trade hand tools: specifications, standards, NEC Code 2011, and lifting heavy loads"
    ]
  },
  {
    moduleName: "Wires, Joints, Soldering, and U.G.Cables",
    moduleNumber: 2,
    topics: [
      "Fundamentals of electricity, conductors, insulators, wire size measurement, and crimping",
      "Various types of wire joints and soldering methods",
      "Underground (UG) cables: construction details, materials, joints, and testing"
    ]
  },
  {
    moduleName: "Basic Electrical Practice",
    moduleNumber: 3,
    topics: [
      "Ohm's law, simple electrical circuits, and related calculations",
      "Kirchhoff's law and its practical applications",
      "DC series and parallel circuits",
      "Effects of open and short circuits in series and parallel networks",
      "Laws of resistance and understanding various types of resistors",
      "Wheatstone bridge principle and its applications",
      "The effect of temperature variations on electrical resistance",
      "Complex series and parallel combination circuits"
    ]
  },
  {
    moduleName: "Magnetism and Capacitors",
    moduleNumber: 4,
    topics: [
      "Magnetic terms, magnetic materials, and the properties of magnets",
      "Principles and fundamental laws of electromagnetism",
      "Magnetic circuits, including self and mutually induced electromotive forces (EMFs)",
      "Capacitors: classifications, functions, grouping, and uses"
    ]
  },
  {
    moduleName: "AC Circuits",
    moduleNumber: 5,
    topics: [
      "Alternating current terms, definitions, and drawing vector diagrams",
      "Characteristics of series resonance circuits",
      "R-L, R-C, and R-L-C parallel circuits",
      "Characteristics of parallel resonance circuits",
      "Power, energy, and power factor in AC single-phase systems",
      "Understanding the power factor and methods for improvement",
      "Fundamentals of 3-Phase AC systems"
    ]
  },
  {
    moduleName: "Cells and Batteries",
    moduleNumber: 6,
    topics: [
      "Differences and applications of primary cells and secondary cells",
      "Techniques for grouping cells",
      "Battery charging methods and the operation of battery chargers",
      "Routine care and maintenance of batteries",
      "Operation and application of solar cells"
    ]
  },
  {
    moduleName: "Basic Wiring Practice",
    moduleNumber: 7,
    topics: [
      "Bureau of Indian Standards (B.I.S.) symbols used for electrical accessories",
      "Principles and planning for laying out domestic wiring",
      "Test boards, extension boards, and cable color coding",
      "Special wiring circuits, including tunnel, corridor, godown, and hostel wiring"
    ]
  },
  {
    moduleName: "Wiring Installation and Earthing",
    moduleNumber: 8,
    topics: [
      "Installing main boards equipped with MCB, DB switches, and fuse boxes",
      "National Electrical (NE) code of practice and IE Rules regarding mounting energy meter boards",
      "Estimating load, cable size, bill of materials, and the cost for wiring installations",
      "Testing domestic wiring installations, locating faults, and applying remedies",
      "Earthing systems: types, terminology, Megger, and using Earth Resistance Testers"
    ]
  },
  {
    moduleName: "Illumination",
    moduleNumber: 9,
    topics: [
      "Illumination terminology and laws",
      "Low voltage lamps and configuring different wattage lamps in series",
      "Construction details of various types of lamps",
      "Lighting setups for decoration, serial set design, and flashers",
      "Showcase lights, fittings, and calculations for lumen efficiency"
    ]
  },
  {
    moduleName: "Measuring Instruments",
    moduleNumber: 10,
    topics: [
      "Classification of instruments, scales, required forces, and Moving Coil (MC) / Moving Iron (MI) meters",
      "Working principles and use of single and 3-phase wattmeters",
      "Operating a Tong-tester (clamp-on ammeter)",
      "Smart meters, automatic meter reading infrastructure, and supply requirements",
      "Extending the range of MC voltmeters, analyzing loading effects, and voltage drop effects"
    ]
  },
  {
    moduleName: "Domestic Appliances",
    moduleNumber: 11,
    topics: [
      "The concepts of Neutral and Earth applied to cooking ranges",
      "Maintenance of heating elements, immersion heaters, electric stoves, and hot plates",
      "Servicing food mixers",
      "Dismantling, repairing, and servicing additional appliances like electric irons, kettles, induction heaters, ovens, and washing machines"
    ]
  },
  {
    moduleName: "Transformers",
    moduleNumber: 12,
    topics: [
      "Transformer working principles, classifications, and EMF equations",
      "Understanding transformer losses, Open Circuit (OC) / Short Circuit (SC) tests, efficiency calculations, and voltage regulation",
      "Executing the parallel operation of two single-phase transformers",
      "Three-phase transformer connections (star, delta)",
      "Methods of cooling transformers and testing transformer oil",
      "Winding small transformers using a winding machine",
      "General maintenance practices for three-phase transformers",
      "Final project work implementation"
    ]
  }
];

const electricianTP: ModuleStructure[] = [
  {
    moduleName: "Safety Practice and Hand Tools",
    moduleNumber: 1,
    topics: [
      "Visit various sections of the institute and locations of electrical installations",
      "Identify safety symbols, hazards, and practice preventive measures for electrical accidents",
      "Practice safe methods of fire fighting and the use of fire extinguishers",
      "Perform elementary first aid, rescue operations, and artificial respiration",
      "Understand the disposal procedures for waste materials and the use of personal protective equipment (PPE)",
      "Maintain workshop cleanliness and perform safe lifting/handling of tools",
      "Identify, care for, and maintain trade tools, including allied tools, filing, and hacksawing"
    ]
  },
  {
    moduleName: "Wires, Joints, Soldering - U.G.Cables",
    moduleNumber: 2,
    topics: [
      "Prepare cable terminations, practice skinning, twisting, and crimping",
      "Identify various cable types and measure conductor size using SWG and a micrometer",
      "Make simple twist, married, Tee, western union, britannia, and rat tail joints",
      "Practice soldering of joints and lugs",
      "Identify parts of underground (UG) cables, perform skinning, dressing, and make straight joints",
      "Test insulation resistance using a megger and check for cable faults"
    ]
  },
  {
    moduleName: "Basic Electrical Practice",
    moduleNumber: 3,
    topics: [
      "Measure parameters in combinational circuits by applying Ohm's Law and analyzing graphs",
      "Measure current and voltage to verify Kirchhoff's Law and the laws of series/parallel circuits",
      "Analyze the effects of short and open faults in series and parallel circuits",
      "Measure resistance using the voltage drop method and the Wheatstone bridge",
      "Determine the thermal effect of electric current and changes in resistance due to temperature"
    ]
  },
  {
    moduleName: "Magnetism and Capacitors",
    moduleNumber: 4,
    topics: [
      "Determine the poles and plot the field of a bar magnet",
      "Wind a solenoid and determine the magnetic effect of electric current",
      "Determine the direction of induced EMF, current, and mutually induced EMF",
      "Measure the resistance, impedance, and inductance of choke coils",
      "Identify, group, charge, discharge, and test various types of capacitors"
    ]
  },
  {
    moduleName: "AC Circuits",
    moduleNumber: 5,
    topics: [
      "Determine the characteristics of R-L, R-C, and R-L-C in AC series and parallel circuits",
      "Measure resonance frequency in AC series and parallel circuits",
      "Measure power, energy, and Power Factor (PF) for single and 3-phase circuits",
      "Practice improving the power factor using capacitors in a 3-phase circuit",
      "Ascertain the use of a neutral wire, phase sequences, and the relationship between line and phase values for star/delta connections",
      "Determine power for balanced/unbalanced loads and analyze phase short-circuits"
    ]
  },
  {
    moduleName: "Cells and Batteries / Solar Cells",
    moduleNumber: 6,
    topics: [
      "Use and group various types of cells for specified voltages and currents",
      "Prepare and practice battery charging and detail the charging circuit",
      "Practice routine care, maintenance, and testing of batteries",
      "Determine the number of solar cells in series/parallel for a given power requirement"
    ]
  },
  {
    moduleName: "Basic Wiring Practice",
    moduleNumber: 7,
    topics: [
      "Identify conduits, electrical accessories, and practice cutting/threading conduits",
      "Prepare test/extension boards and mount accessories like lamp holders, switches, sockets, and MCBs",
      "Draw layouts and practice PVC casing-capping and conduit wiring",
      "Wire up PVC conduits to control lamps from multiple different places and in various switching combinations"
    ]
  },
  {
    moduleName: "Wiring Installation and Earthing",
    moduleNumber: 8,
    topics: [
      "Wire up consumer main boards with MCB, DB, switch, and fuse boxes",
      "Prepare and mount energy meter boards",
      "Estimate costs and bills of material for wiring residential buildings and workshops",
      "Practice domestic and industrial wiring as per IE rules, including testing and fault detection",
      "Prepare pipe and plate earthing and measure earth resistance using an earth tester/megger",
      "Test earth leakage using ELCB and relays"
    ]
  },
  {
    moduleName: "Illumination",
    moduleNumber: 9,
    topics: [
      "Install light fittings with reflectors for direct and indirect lighting",
      "Group different wattage lamps in series",
      "Practice the installation of various lamps (e.g., fluorescent, mercury vapour, sodium vapour, metal halide)",
      "Prepare decorative lamp circuits (rotating/running effects) and showcase lighting"
    ]
  },
  {
    moduleName: "Measuring Instruments",
    moduleNumber: 10,
    topics: [
      "Practice using analog/digital instruments in single and 3-phase circuits (multimeter, wattmeter, frequency meter, etc.)",
      "Measure 3-phase power using the two-wattmeter method and verify power factor meter readings",
      "Measure electrical parameters using a tong tester in 3-phase circuits",
      "Demonstrate, perform readings on, install, and diagnose smart meters",
      "Extend instrument ranges, perform calibrations, and determine testing errors"
    ]
  },
  {
    moduleName: "Domestic Appliances",
    moduleNumber: 11,
    topics: [
      "Dismantle and assemble electrical parts of cooking ranges, geysers, washing machines, and pump sets",
      "Service and repair electric irons, electric kettles, cooking ranges, and geysers",
      "Service and repair induction heaters, ovens, mixers, grinders, and washing machines"
    ]
  },
  {
    moduleName: "Transformers",
    moduleNumber: 12,
    topics: [
      "Verify terminals, identify components, and calculate transformation ratios for single-phase transformers",
      "Perform open/short circuit tests and determine voltage regulation at different loads",
      "Perform series and parallel operations of single-phase transformers",
      "Perform 3-phase operations (delta-delta, delta-star, star-star, star-delta)",
      "Test transformer oil, practice winding small transformers, and carry out general maintenance"
    ]
  }
];

async function loadManualSyllabus() {
  const storage = new SyllabusStructureStorage();

  try {
    console.log('📚 Loading manual syllabus structure...\n');

    // Clear existing syllabus data for electrician
    await storage.clearSyllabusData('electrician');
    console.log('✅ Cleared existing electrician syllabus data\n');

    // Store Theory syllabus
    console.log('📖 Storing Electrician Theory (TT) syllabus...');
    await storage.storeSyllabusStructure('electrician', 'trade_theory', electricianTT);
    const ttTopics = electricianTT.reduce((sum, m) => sum + m.topics.length, 0);
    console.log(`✅ Stored ${electricianTT.length} modules, ${ttTopics} topics\n`);

    // Store Practical syllabus
    console.log('📖 Storing Electrician Practical (TP) syllabus...');
    await storage.storeSyllabusStructure('electrician', 'trade_practical', electricianTP);
    const tpTopics = electricianTP.reduce((sum, m) => sum + m.topics.length, 0);
    console.log(`✅ Stored ${electricianTP.length} modules, ${tpTopics} topics\n`);

    // Show statistics
    const stats = await storage.getStatistics();
    console.log('📊 Final Statistics:');
    for (const stat of stats) {
      const tradeLabel = stat.trade_type === 'trade_theory' ? 'Theory' : 'Practical';
      console.log(`  ${stat.course} - ${tradeLabel}:`);
      console.log(`    Modules: ${stat.module_count}`);
      console.log(`    Topics: ${stat.total_topics}`);
    }

    console.log('\n✅ Manual syllabus loaded successfully!');
    await storage.close();
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    process.exit(1);
  }
}

loadManualSyllabus();
