#!/usr/bin/env tsx

/**
 * Generate sample ITI course content for testing
 * This creates realistic text-based PDFs that can be processed immediately
 */

import fs from 'fs/promises'
import path from 'path'

const FITTER_TP_CONTENT = `
ITI FITTER TRADE - FIRST YEAR
TRADE PRACTICAL (TP)

MODULE 1: SAFETY AND FIRST AID

1.1 Workshop Safety
Personal protective equipment (PPE) is essential for all workshop activities. Safety helmets, protective eyewear, safety shoes, and work gloves must be worn at all times. Fire extinguishers should be located at accessible points throughout the workshop. Emergency exits must be clearly marked and kept unobstructed.

1.2 First Aid Procedures
Basic first aid knowledge is crucial for workshop safety. Minor cuts should be cleaned and bandaged immediately. Burns require immediate cooling with water. In case of serious injury, contact emergency services immediately. A first aid kit must be maintained and regularly checked.

1.3 Machine Safety
Before operating any machine, ensure all safety guards are in place. Never wear loose clothing near rotating machinery. Always disconnect power before maintenance. Keep work area clean and free of obstacles.

MODULE 2: HAND TOOLS AND THEIR USES

2.1 Measuring Tools
Vernier calipers provide measurements to 0.02mm accuracy. Micrometers offer even greater precision for critical measurements. Steel rules are used for general measurements. Dial indicators measure small variations in dimensions.

2.2 Marking Tools
Scriber marks are used for layout work on metal surfaces. Center punches create starting points for drilling. Dividers transfer measurements and scribe circles. Surface plates provide flat reference surfaces.

2.3 Cutting Tools
Hacksaws cut metal using replaceable blades. Files remove material and smooth surfaces. Chisels cut and shape metal. Proper tool selection ensures quality work.

MODULE 3: BENCH WORK

3.1 Filing Operations
Filing removes material to achieve desired dimensions. Cross filing removes material quickly. Draw filing produces smooth finishes. Proper file maintenance extends tool life.

3.2 Sawing Operations
Hacksaw blade selection depends on material hardness. Proper blade tension prevents breakage. Cutting speed affects blade life. Coolant use improves cutting performance.

3.3 Drilling Operations
Drill bit selection depends on hole size and material. Proper speeds and feeds prevent tool damage. Center drilling ensures accurate hole location. Coolant prevents overheating.

MODULE 4: FITTING OPERATIONS

4.1 Assembly Techniques
Proper assembly sequence prevents damage. Fastener torque specifications must be followed. Thread locking compounds prevent loosening. Gaskets ensure leak-free joints.

4.2 Alignment Methods
Precision alignment ensures proper operation. Dial indicators measure alignment accuracy. Shims adjust component positions. Laser alignment tools improve accuracy.

MODULE 5: BASIC ELECTRICITY

5.1 Electrical Safety
Electrical safety is paramount. Always disconnect power before work. Use insulated tools for electrical work. Test circuits before touching. Ground all equipment properly.

5.2 Basic Circuits
Series circuits have one current path. Parallel circuits have multiple paths. Ohm's law relates voltage, current, and resistance. Circuit protection prevents damage.

MODULE 6: WELDING AND JOINING

6.1 Arc Welding
Arc welding joins metals using electrical arc. Proper electrode selection ensures strong welds. Welding current affects penetration. Welding speed affects bead appearance.

6.2 Gas Welding
Oxy-acetylene welding uses flame heat. Proper flame adjustment is critical. Filler rod selection matches base metal. Joint preparation ensures quality welds.

PRACTICAL EXERCISES

Exercise 1: File a flat surface to ±0.1mm tolerance
Exercise 2: Drill holes to specified dimensions
Exercise 3: Assemble components using proper techniques
Exercise 4: Perform basic welding operations
Exercise 5: Measure components using precision tools

SAFETY REMINDERS
- Always wear PPE
- Keep work area clean
- Report unsafe conditions
- Follow all safety procedures
- Never bypass safety devices

ASSESSMENT CRITERIA
- Safety practices: 20%
- Tool usage: 25%
- Measurement accuracy: 25%
- Work quality: 20%
- Time management: 10%
`.repeat(50) // Repeat to create substantial content

const FITTER_TT_CONTENT = `
ITI FITTER TRADE - FIRST YEAR
TRADE THEORY (TT)

MODULE 1: ENGINEERING DRAWING

1.1 Introduction to Engineering Drawing
Engineering drawings communicate technical information. Orthographic projection shows multiple views. Isometric drawings show 3D objects. Dimensioning specifies sizes accurately.

1.2 Lines and Symbols
Different line types convey different meanings. Continuous thick lines show visible edges. Dashed lines show hidden features. Center lines locate circular features.

1.3 Geometric Constructions
Geometric constructions create accurate shapes. Bisecting lines divides them equally. Constructing perpendiculars creates right angles. Drawing tangents connects curves smoothly.

MODULE 2: ENGINEERING MATERIALS

2.1 Ferrous Metals
Iron and steel are ferrous metals. Carbon content affects steel properties. Alloy steels contain additional elements. Heat treatment modifies metal properties.

2.2 Non-Ferrous Metals
Aluminum is lightweight and corrosion resistant. Copper conducts electricity well. Brass is an alloy of copper and zinc. Bronze contains copper and tin.

2.3 Material Properties
Strength resists applied forces. Hardness resists indentation. Ductility allows stretching. Malleability allows hammering.

MODULE 3: WORKSHOP CALCULATIONS

3.1 Basic Mathematics
Addition, subtraction, multiplication, and division are fundamental. Fractions represent parts of wholes. Decimals provide precise values. Percentages show proportions.

3.2 Mensuration
Area calculations determine surface sizes. Volume calculations determine capacity. Perimeter calculations determine boundaries. Formulas simplify calculations.

3.3 Trigonometry
Sine, cosine, and tangent relate angles to sides. Right triangles have one 90-degree angle. Pythagorean theorem relates triangle sides. Trigonometry solves angle problems.

MODULE 4: SCIENCE

4.1 Basic Physics
Force causes motion or deformation. Work transfers energy. Power measures work rate. Machines multiply force or speed.

4.2 Heat and Temperature
Heat is energy transfer. Temperature measures hotness. Thermal expansion changes dimensions. Heat treatment modifies properties.

4.3 Mechanics
Statics studies forces in equilibrium. Dynamics studies motion. Friction opposes motion. Lubrication reduces friction.

MODULE 5: WORKSHOP TECHNOLOGY

5.1 Machine Tools
Lathes rotate workpieces. Milling machines use rotating cutters. Drilling machines create holes. Grinding machines finish surfaces.

5.2 Cutting Tool Materials
High-speed steel resists heat. Carbide tools last longer. Ceramic tools cut hard materials. Tool coatings improve performance.

5.3 Machining Parameters
Cutting speed affects tool life. Feed rate affects surface finish. Depth of cut affects material removal. Coolant improves performance.

MODULE 6: METROLOGY

6.1 Linear Measurements
Vernier calipers measure to 0.02mm. Micrometers measure to 0.01mm. Dial indicators measure variations. Gauge blocks provide standards.

6.2 Angular Measurements
Protractors measure angles. Bevel protractors measure bevels. Sine bars measure precise angles. Angle gauges provide standards.

6.3 Measurement Accuracy
Accuracy measures correctness. Precision measures repeatability. Errors affect measurements. Calibration ensures accuracy.

THEORY QUESTIONS

Q1: What is the purpose of engineering drawings?
Q2: Explain the difference between ferrous and non-ferrous metals.
Q3: How does heat treatment affect steel properties?
Q4: What factors affect cutting tool life?
Q5: Why is measurement accuracy important?

FORMULAS TO REMEMBER
- Area of rectangle = length × width
- Volume of cylinder = π × r² × h
- Cutting speed = π × D × N / 1000
- Power = Force × Velocity
- Stress = Force / Area
`.repeat(40)

const ELECTRICIAN_TP_CONTENT = `
ITI ELECTRICIAN TRADE - FIRST YEAR
TRADE PRACTICAL (TP)

MODULE 1: ELECTRICAL SAFETY

1.1 Safety Precautions
Electrical safety prevents accidents and saves lives. Always disconnect power before working on circuits. Use insulated tools rated for electrical work. Wear rubber-soled shoes and avoid wet conditions. Test circuits with multimeter before touching.

1.2 Personal Protective Equipment
Safety glasses protect eyes from arc flash. Insulated gloves prevent electric shock. Flame-resistant clothing protects from burns. Hard hats protect from falling objects. Safety shoes have non-conductive soles.

1.3 Emergency Procedures
Know location of emergency shutoff switches. Understand how to use fire extinguishers. Learn CPR and first aid procedures. Report all accidents immediately. Keep emergency numbers accessible.

MODULE 2: BASIC ELECTRICAL CIRCUITS

2.1 Series Circuits
In series circuits, current flows through one path. Total resistance equals sum of individual resistances. Voltage divides across components. Current remains constant throughout. One component failure breaks entire circuit.

2.2 Parallel Circuits
Parallel circuits provide multiple current paths. Voltage remains constant across branches. Total current equals sum of branch currents. Individual component failure doesn't affect others. Resistance decreases with more branches.

2.3 Series-Parallel Circuits
Complex circuits combine series and parallel elements. Analyze by breaking into simpler sections. Calculate equivalent resistances step by step. Apply Ohm's law to each section. Verify calculations with measurements.

MODULE 3: ELECTRICAL WIRING

3.1 Wiring Materials
Copper wire conducts electricity efficiently. Wire gauge indicates diameter and current capacity. Insulation prevents short circuits. Conduit protects wiring. Junction boxes house connections.

3.2 Wiring Methods
Surface wiring mounts on walls. Concealed wiring runs inside walls. Conduit wiring uses protective tubes. Cable wiring uses multi-conductor cables. Proper methods ensure safety.

3.3 Wiring Connections
Twist connections join wires mechanically. Solder connections provide permanent joints. Wire nuts secure multiple wires. Terminal blocks organize connections. Proper connections prevent failures.

MODULE 4: ELECTRICAL MACHINES

4.1 DC Motors
DC motors convert electrical to mechanical energy. Armature rotates in magnetic field. Commutator switches current direction. Brushes conduct current to armature. Speed control varies voltage or field.

4.2 AC Motors
Induction motors use rotating magnetic field. Synchronous motors run at constant speed. Single-phase motors need starting mechanism. Three-phase motors self-start. Motor selection depends on application.

4.3 Transformers
Transformers change voltage levels. Primary winding receives input. Secondary winding delivers output. Turns ratio determines voltage change. Core material affects efficiency.

MODULE 5: ELECTRICAL MEASUREMENTS

5.1 Multimeter Usage
Multimeters measure voltage, current, and resistance. Select proper range before measuring. Connect probes correctly for accurate readings. AC and DC modes measure different currents. Auto-ranging simplifies measurements.

5.2 Clamp Meters
Clamp meters measure current without breaking circuit. Jaw clamps around single conductor. Display shows current magnitude. Useful for high-current measurements. Some models measure voltage too.

MODULE 6: INSTALLATION PRACTICES

6.1 Residential Wiring
Residential circuits serve lighting and outlets. Circuit breakers protect against overload. GFCI outlets prevent shock in wet areas. Proper grounding ensures safety. Code compliance is mandatory.

6.2 Industrial Wiring
Industrial systems handle higher voltages and currents. Motor control circuits start and stop equipment. Control panels house electrical components. Cable trays organize multiple cables. Maintenance access is essential.

PRACTICAL EXERCISES

Exercise 1: Wire a simple lighting circuit
Exercise 2: Install electrical outlets properly
Exercise 3: Connect and test a DC motor
Exercise 4: Measure circuit parameters accurately
Exercise 5: Troubleshoot common electrical faults

SAFETY CHECKLIST
- Power disconnected before work
- Proper PPE worn
- Tools inspected and rated
- Work area clear and dry
- Lockout/tagout procedures followed
`.repeat(45)

const ELECTRICIAN_TT_CONTENT = `
ITI ELECTRICIAN TRADE - FIRST YEAR
TRADE THEORY (TT)

MODULE 1: ELECTRICAL FUNDAMENTALS

1.1 Electric Current
Electric current is flow of electrons through conductor. Measured in amperes (A). Direct current flows one direction. Alternating current reverses periodically. Current magnitude depends on voltage and resistance.

1.2 Voltage and Potential Difference
Voltage is electrical pressure driving current. Measured in volts (V). Higher voltage pushes more current. Voltage sources include batteries and generators. Potential difference exists between two points.

1.3 Resistance and Conductance
Resistance opposes current flow. Measured in ohms (Ω). Conductors have low resistance. Insulators have high resistance. Temperature affects resistance.

MODULE 2: OHM'S LAW AND POWER

2.1 Ohm's Law
Ohm's law relates voltage, current, and resistance. V = I × R is fundamental equation. Current increases with voltage. Current decreases with resistance. Law applies to DC and AC circuits.

2.2 Electrical Power
Power is rate of energy consumption. Measured in watts (W). P = V × I calculates power. Power dissipates as heat in resistors. Efficiency compares output to input power.

2.3 Energy Calculations
Energy is power consumed over time. Measured in watt-hours or kilowatt-hours. E = P × t calculates energy. Utility bills charge for energy consumed. Energy conservation reduces costs.

MODULE 3: MAGNETISM AND ELECTROMAGNETISM

3.1 Magnetic Fields
Magnets create magnetic fields. North and south poles attract opposites. Magnetic field lines show direction. Ferromagnetic materials concentrate fields. Permanent magnets retain magnetism.

3.2 Electromagnets
Current-carrying conductors create magnetic fields. Coils concentrate magnetic fields. Iron cores strengthen electromagnets. Field strength depends on current and turns. Electromagnets have many applications.

3.3 Electromagnetic Induction
Moving magnetic field induces voltage. Faraday's law quantifies induction. Lenz's law determines induced current direction. Generators use induction to produce electricity. Transformers use induction to change voltage.

MODULE 4: AC CIRCUITS

4.1 AC Fundamentals
AC voltage and current vary sinusoidally. Frequency measures cycles per second. Period is time for one cycle. Peak value is maximum magnitude. RMS value equals equivalent DC value.

4.2 Reactance and Impedance
Inductors oppose current changes. Capacitors oppose voltage changes. Reactance is AC resistance. Impedance combines resistance and reactance. Phase angle relates voltage and current.

4.3 Power in AC Circuits
Real power does useful work. Reactive power oscillates in circuit. Apparent power is vector sum. Power factor relates real to apparent power. Poor power factor wastes energy.

MODULE 5: ELECTRICAL MACHINES THEORY

5.1 DC Machine Principles
DC machines convert between electrical and mechanical energy. Generator action produces voltage. Motor action produces torque. Commutation maintains DC current. Field and armature interact magnetically.

5.2 AC Machine Principles
Rotating magnetic field drives induction motors. Synchronous speed depends on frequency and poles. Slip allows induction motor operation. Torque depends on slip and design. Efficiency improves with proper loading.

5.3 Transformer Theory
Transformers transfer power between circuits. Mutual inductance couples windings. Voltage ratio equals turns ratio. Current ratio is inverse of turns ratio. Losses reduce efficiency.

MODULE 6: ELECTRICAL INSTALLATION STANDARDS

6.1 National Electrical Code
NEC provides safety standards. Covers wiring methods and materials. Specifies circuit protection requirements. Defines grounding and bonding rules. Regular updates incorporate new technology.

6.2 Circuit Protection
Fuses melt to interrupt excessive current. Circuit breakers trip on overload. GFCI protects against ground faults. AFCI detects arc faults. Proper sizing prevents nuisance tripping.

6.3 Grounding and Bonding
Grounding connects to earth. Bonding connects metal parts. Ground fault current returns safely. Equipment grounding prevents shock. System grounding stabilizes voltage.

THEORY QUESTIONS

Q1: State Ohm's law and explain its significance.
Q2: What is the difference between AC and DC?
Q3: How does electromagnetic induction work?
Q4: Explain the purpose of circuit breakers.
Q5: Why is proper grounding important?

IMPORTANT FORMULAS
- Ohm's Law: V = I × R
- Power: P = V × I
- Energy: E = P × t
- Resistance: R = ρ × L / A
- Transformer: V₁/V₂ = N₁/N₂
`.repeat(35)

async function createSamplePDF(filename: string, content: string, course: 'fitter' | 'electrician') {
  const dir = path.join(process.cwd(), course)
  const filepath = path.join(dir, filename)
  
  // Create a simple text file (we'll rename it to .txt for now)
  const txtPath = filepath.replace('.pdf', '_SAMPLE.txt')
  await fs.writeFile(txtPath, content, 'utf-8')
  
  console.log(`✅ Created: ${filename.replace('.pdf', '_SAMPLE.txt')}`)
  console.log(`   Content length: ${content.length} characters`)
}

async function main() {
  console.log('🎯 Generating Sample ITI Course Content\n')
  console.log('This creates realistic sample content for testing the RAG system.\n')
  
  try {
    // Create sample content files
    await createSamplePDF('Fitter - 1st Year - TP (NSQF 2022).pdf', FITTER_TP_CONTENT, 'fitter')
    await createSamplePDF('Fitter - 1st Year - TT (NSQF 2022).pdf', FITTER_TT_CONTENT, 'fitter')
    await createSamplePDF('Electrician - 1st year - TP (NSQF 2022).pdf', ELECTRICIAN_TP_CONTENT, 'electrician')
    await createSamplePDF('Electrician - 1st year - TT (NSQF 2022).pdf', ELECTRICIAN_TT_CONTENT, 'electrician')
    
    console.log('\n✅ Sample content generated successfully!')
    console.log('\n📝 Created 4 text files with realistic ITI course content')
    console.log('   These files contain substantial content for testing')
    console.log('\n⚠️  Note: These are sample files, not the actual PDFs')
    console.log('   But they will allow you to test the RAG system immediately!')
    
    console.log('\n🚀 Next steps:')
    console.log('   1. The sample files are ready to use')
    console.log('   2. For now, you can manually copy content from these files')
    console.log('   3. Or wait for a proper OCR solution for the real PDFs')
    
  } catch (error) {
    console.error('❌ Error generating sample content:', error)
    process.exit(1)
  }
}

main()
