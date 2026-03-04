'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

// Define types inline
interface Topic {
  title: string;
}

interface Module {
  moduleNumber: number;
  moduleName: string;
  hours: number;
  topics: Topic[];
}

interface CurriculumData {
  trade: string;
  tradeType: 'TT' | 'TP';
  totalHours: number;
  modules: Module[];
}

// Inline curriculum data to avoid export issues
const getCurriculumData = (tradeType: 'TT' | 'TP'): CurriculumData => {
  if (tradeType === 'TT') {
    return {
      trade: 'Electrician',
      tradeType: 'TT',
      totalHours: 840,
      modules: [
        {
          moduleNumber: 1,
          moduleName: 'Safety Practice and Hand Tools',
          hours: 40,
          topics: [
            { title: 'Organization of ITIs and the scope of the electrician trade' },
            { title: 'Safety rules, safety signs, and hazard identification' },
            { title: 'Types of fires and the use of fire extinguishers' },
            { title: 'Rescue operations, first aid treatment, and artificial respiration' },
            { title: 'Procedures for the disposal of waste material' },
            { title: 'Usage of Personal Protective Equipment (PPE)' },
            { title: 'Guidelines for workshop cleanliness and maintenance' },
            { title: 'Trade hand tools: specifications, standards, NEC Code 2011, and lifting heavy loads' }
          ]
        },
        {
          moduleNumber: 2,
          moduleName: 'Wires, Joints, Soldering, and U.G.Cables',
          hours: 95,
          topics: [
            { title: 'Fundamentals of electricity, conductors, insulators, wire size measurement, and crimping' },
            { title: 'Various types of wire joints and soldering methods' },
            { title: 'Underground (UG) cables: construction details, materials, joints, and testing' }
          ]
        },
        {
          moduleNumber: 3,
          moduleName: 'Basic Electrical Practice',
          hours: 51,
          topics: [
            { title: "Ohm's law, simple electrical circuits, and related calculations" },
            { title: "Kirchhoff's law and its practical applications" },
            { title: 'DC series and parallel circuits' },
            { title: 'Effects of open and short circuits in series and parallel networks' },
            { title: 'Laws of resistance and understanding various types of resistors' },
            { title: 'Wheatstone bridge principle and its applications' },
            { title: 'The effect of temperature variations on electrical resistance' },
            { title: 'Complex series and parallel combination circuits' }
          ]
        },
        {
          moduleNumber: 4,
          moduleName: 'Magnetism and Capacitors',
          hours: 32,
          topics: [
            { title: 'Magnetic terms, magnetic materials, and the properties of magnets' },
            { title: 'Principles and fundamental laws of electromagnetism' },
            { title: 'Magnetic circuits, including self and mutually induced electromotive forces (EMFs)' },
            { title: 'Capacitors: classifications, functions, grouping, and uses' }
          ]
        },
        {
          moduleNumber: 5,
          moduleName: 'AC Circuits',
          hours: 77,
          topics: [
            { title: 'Alternating current terms, definitions, and drawing vector diagrams' },
            { title: 'Characteristics of series resonance circuits' },
            { title: 'R-L, R-C, and R-L-C parallel circuits' },
            { title: 'Characteristics of parallel resonance circuits' },
            { title: 'Power, energy, and power factor in AC single-phase systems' },
            { title: 'Understanding the power factor and methods for improvement' },
            { title: 'Fundamentals of 3-Phase AC systems' }
          ]
        },
        {
          moduleNumber: 6,
          moduleName: 'Cells and Batteries',
          hours: 50,
          topics: [
            { title: 'Differences and applications of primary cells and secondary cells' },
            { title: 'Techniques for grouping cells' },
            { title: 'Battery charging methods and the operation of battery chargers' },
            { title: 'Routine care and maintenance of batteries' },
            { title: 'Operation and application of solar cells' }
          ]
        },
        {
          moduleNumber: 7,
          moduleName: 'Basic Wiring Practice',
          hours: 110,
          topics: [
            { title: 'Bureau of Indian Standards (B.I.S.) symbols used for electrical accessories' },
            { title: 'Principles and planning for laying out domestic wiring' },
            { title: 'Test boards, extension boards, and cable color coding' },
            { title: 'Special wiring circuits, including tunnel, corridor, godown, and hostel wiring' }
          ]
        },
        {
          moduleNumber: 8,
          moduleName: 'Wiring Installation and Earthing',
          hours: 115,
          topics: [
            { title: 'Installing main boards equipped with MCB, DB switches, and fuse boxes' },
            { title: 'National Electrical (NE) code of practice and IE Rules regarding mounting energy meter boards' },
            { title: 'Estimating load, cable size, bill of materials, and the cost for wiring installations' },
            { title: 'Testing domestic wiring installations, locating faults, and applying remedies' },
            { title: 'Earthing systems: types, terminology, Megger, and using Earth Resistance Testers' }
          ]
        },
        {
          moduleNumber: 9,
          moduleName: 'Illumination',
          hours: 45,
          topics: [
            { title: 'Illumination terminology and laws' },
            { title: 'Low voltage lamps and configuring different wattage lamps in series' },
            { title: 'Construction details of various types of lamps' },
            { title: 'Lighting setups for decoration, serial set design, and flashers' },
            { title: 'Showcase lights, fittings, and calculations for lumen efficiency' }
          ]
        },
        {
          moduleNumber: 10,
          moduleName: 'Measuring Instruments',
          hours: 75,
          topics: [
            { title: 'Classification of instruments, scales, required forces, and Moving Coil (MC) / Moving Iron (MI) meters' },
            { title: 'Working principles and use of single and 3-phase wattmeters' },
            { title: 'Operating a Tong-tester (clamp-on ammeter)' },
            { title: 'Smart meters, automatic meter reading infrastructure, and supply requirements' },
            { title: 'Extending the range of MC voltmeters, analyzing loading effects, and voltage drop effects' }
          ]
        },
        {
          moduleNumber: 11,
          moduleName: 'Domestic Appliances',
          hours: 75,
          topics: [
            { title: 'The concepts of Neutral and Earth applied to cooking ranges' },
            { title: 'Maintenance of heating elements, immersion heaters, electric stoves, and hot plates' },
            { title: 'Servicing food mixers' },
            { title: 'Dismantling, repairing, and servicing additional appliances like electric irons, kettles, induction heaters, ovens, and washing machines' }
          ]
        },
        {
          moduleNumber: 12,
          moduleName: 'Transformers',
          hours: 75,
          topics: [
            { title: 'Transformer working principles, classifications, and EMF equations' },
            { title: 'Understanding transformer losses, Open Circuit (OC) / Short Circuit (SC) tests, efficiency calculations, and voltage regulation' },
            { title: 'Executing the parallel operation of two single-phase transformers' },
            { title: 'Three-phase transformer connections (star, delta)' },
            { title: 'Methods of cooling transformers and testing transformer oil' },
            { title: 'Winding small transformers using a winding machine' },
            { title: 'General maintenance practices for three-phase transformers' },
            { title: 'Final project work implementation' }
          ]
        }
      ]
    };
  } else {
    // TP curriculum
    return {
      trade: 'Electrician',
      tradeType: 'TP',
      totalHours: 840,
      modules: [
        {
          moduleNumber: 1,
          moduleName: 'Safety Practice and Hand Tools',
          hours: 40,
          topics: [
            { title: 'Visit various sections of the institute and locations of electrical installations' },
            { title: 'Identify safety symbols, hazards, and practice preventive measures for electrical accidents' },
            { title: 'Practice safe methods of fire fighting and the use of fire extinguishers' },
            { title: 'Perform elementary first aid, rescue operations, and artificial respiration' },
            { title: 'Understand the disposal procedures for waste materials and the use of personal protective equipment (PPE)' },
            { title: 'Maintain workshop cleanliness and perform safe lifting/handling of tools' },
            { title: 'Identify, care for, and maintain trade tools, including allied tools, filing, and hacksawing' }
          ]
        },
        {
          moduleNumber: 2,
          moduleName: 'Wires, Joints, Soldering - U.G.Cables',
          hours: 95,
          topics: [
            { title: 'Prepare cable terminations, practice skinning, twisting, and crimping' },
            { title: 'Identify various cable types and measure conductor size using SWG and a micrometer' },
            { title: 'Make simple twist, married, Tee, western union, britannia, and rat tail joints' },
            { title: 'Practice soldering of joints and lugs' },
            { title: 'Identify parts of underground (UG) cables, perform skinning, dressing, and make straight joints' },
            { title: 'Test insulation resistance using a megger and check for cable faults' }
          ]
        },
        {
          moduleNumber: 3,
          moduleName: 'Basic Electrical Practice',
          hours: 51,
          topics: [
            { title: "Measure parameters in combinational circuits by applying Ohm's Law and analyzing graphs" },
            { title: "Measure current and voltage to verify Kirchhoff's Law and the laws of series/parallel circuits" },
            { title: 'Analyze the effects of short and open faults in series and parallel circuits' },
            { title: 'Measure resistance using the voltage drop method and the Wheatstone bridge' },
            { title: 'Determine the thermal effect of electric current and changes in resistance due to temperature' }
          ]
        },
        {
          moduleNumber: 4,
          moduleName: 'Magnetism and Capacitors',
          hours: 32,
          topics: [
            { title: 'Determine the poles and plot the field of a bar magnet' },
            { title: 'Wind a solenoid and determine the magnetic effect of electric current' },
            { title: 'Determine the direction of induced EMF, current, and mutually induced EMF' },
            { title: 'Measure the resistance, impedance, and inductance of choke coils' },
            { title: 'Identify, group, charge, discharge, and test various types of capacitors' }
          ]
        },
        {
          moduleNumber: 5,
          moduleName: 'AC Circuits',
          hours: 77,
          topics: [
            { title: 'Determine the characteristics of R-L, R-C, and R-L-C in AC series and parallel circuits' },
            { title: 'Measure resonance frequency in AC series and parallel circuits' },
            { title: 'Measure power, energy, and Power Factor (PF) for single and 3-phase circuits' },
            { title: 'Practice improving the power factor using capacitors in a 3-phase circuit' },
            { title: 'Ascertain the use of a neutral wire, phase sequences, and the relationship between line and phase values for star/delta connections' },
            { title: 'Determine power for balanced/unbalanced loads and analyze phase short-circuits' }
          ]
        },
        {
          moduleNumber: 6,
          moduleName: 'Cells and Batteries / Solar Cells',
          hours: 50,
          topics: [
            { title: 'Use and group various types of cells for specified voltages and currents' },
            { title: 'Prepare and practice battery charging and detail the charging circuit' },
            { title: 'Practice routine care, maintenance, and testing of batteries' },
            { title: 'Determine the number of solar cells in series/parallel for a given power requirement' }
          ]
        },
        {
          moduleNumber: 7,
          moduleName: 'Basic Wiring Practice',
          hours: 110,
          topics: [
            { title: 'Identify conduits, electrical accessories, and practice cutting/threading conduits' },
            { title: 'Prepare test/extension boards and mount accessories like lamp holders, switches, sockets, and MCBs' },
            { title: 'Draw layouts and practice PVC casing-capping and conduit wiring' },
            { title: 'Wire up PVC conduits to control lamps from multiple different places and in various switching combinations' }
          ]
        },
        {
          moduleNumber: 8,
          moduleName: 'Wiring Installation and Earthing',
          hours: 115,
          topics: [
            { title: 'Wire up consumer main boards with MCB, DB, switch, and fuse boxes' },
            { title: 'Prepare and mount energy meter boards' },
            { title: 'Estimate costs and bills of material for wiring residential buildings and workshops' },
            { title: 'Practice domestic and industrial wiring as per IE rules, including testing and fault detection' },
            { title: 'Prepare pipe and plate earthing and measure earth resistance using an earth tester/megger' },
            { title: 'Test earth leakage using ELCB and relays' }
          ]
        },
        {
          moduleNumber: 9,
          moduleName: 'Illumination',
          hours: 45,
          topics: [
            { title: 'Install light fittings with reflectors for direct and indirect lighting' },
            { title: 'Group different wattage lamps in series' },
            { title: 'Practice the installation of various lamps (e.g., fluorescent, mercury vapour, sodium vapour, metal halide)' },
            { title: 'Prepare decorative lamp circuits (rotating/running effects) and showcase lighting' }
          ]
        },
        {
          moduleNumber: 10,
          moduleName: 'Measuring Instruments',
          hours: 75,
          topics: [
            { title: 'Practice using analog/digital instruments in single and 3-phase circuits (multimeter, wattmeter, frequency meter, etc.)' },
            { title: 'Measure 3-phase power using the two-wattmeter method and verify power factor meter readings' },
            { title: 'Measure electrical parameters using a tong tester in 3-phase circuits' },
            { title: 'Demonstrate, perform readings on, install, and diagnose smart meters' },
            { title: 'Extend instrument ranges, perform calibrations, and determine testing errors' }
          ]
        },
        {
          moduleNumber: 11,
          moduleName: 'Domestic Appliances',
          hours: 75,
          topics: [
            { title: 'Dismantle and assemble electrical parts of cooking ranges, geysers, washing machines, and pump sets' },
            { title: 'Service and repair electric irons, electric kettles, cooking ranges, and geysers' },
            { title: 'Service and repair induction heaters, ovens, mixers, grinders, and washing machines' }
          ]
        },
        {
          moduleNumber: 12,
          moduleName: 'Transformers',
          hours: 75,
          topics: [
            { title: 'Verify terminals, identify components, and calculate transformation ratios for single-phase transformers' },
            { title: 'Perform open/short circuit tests and determine voltage regulation at different loads' },
            { title: 'Perform series and parallel operations of single-phase transformers' },
            { title: 'Perform 3-phase operations (delta-delta, delta-star, star-star, star-delta)' },
            { title: 'Test transformer oil, practice winding small transformers, and carry out general maintenance' }
          ]
        }
      ]
    };
  }
};

export default function CurriculumPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'modules' | 'syllabus'>('modules');
  const [selectedTradeType, setSelectedTradeType] = useState<'TT' | 'TP'>('TT');
  const [selectedPdfType, setSelectedPdfType] = useState<'index' | 'syllabus'>('index');

  // Check authentication
  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const curriculum: CurriculumData = getCurriculumData(selectedTradeType);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navigation user={user} />
      
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Electrician Curriculum</h1>
          <p className="mt-2 text-sm text-gray-600">
            Complete course structure for ITI Electrician Trade (NSQF 2022)
          </p>
        </div>
      </div>

      {/* Trade Type Selector */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex space-x-4">
          <button
            onClick={() => setSelectedTradeType('TT')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              selectedTradeType === 'TT'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Trade Theory (TT)
          </button>
          <button
            onClick={() => setSelectedTradeType('TP')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              selectedTradeType === 'TP'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Trade Practical (TP)
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setSelectedTab('modules')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'modules'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Modules & Topics
            </button>
            <button
              onClick={() => setSelectedTab('syllabus')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'syllabus'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Syllabus Documents
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedTab === 'modules' ? (
          <ModulesView curriculum={curriculum} />
        ) : (
          <SyllabusView 
            tradeType={selectedTradeType} 
            selectedPdfType={selectedPdfType}
            setSelectedPdfType={setSelectedPdfType}
          />
        )}
      </div>
    </div>
  );
}

function ModulesView({ curriculum }: { curriculum: CurriculumData }) {
  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {curriculum.trade} - {curriculum.tradeType === 'TT' ? 'Trade Theory' : 'Trade Practical'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total Duration</p>
            <p className="text-2xl font-bold text-blue-600">{curriculum.totalHours} Hours</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total Modules</p>
            <p className="text-2xl font-bold text-green-600">{curriculum.modules.length} Modules</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total Topics</p>
            <p className="text-2xl font-bold text-purple-600">
              {curriculum.modules.reduce((sum, m) => sum + m.topics.length, 0)} Topics
            </p>
          </div>
        </div>
      </div>

      {/* Modules List */}
      <div className="space-y-4">
        {curriculum.modules.map((module) => (
          <div key={module.moduleNumber} className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold">
                      {module.moduleNumber}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {module.moduleName}
                      </h3>
                      <p className="text-sm text-gray-500">{module.hours} Hours</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Topics */}
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Topics Covered:</h4>
                <ul className="space-y-2">
                  {module.topics.map((topic, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 mr-3"></span>
                      <span className="text-sm text-gray-600">{topic.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SyllabusView({ 
  tradeType, 
  selectedPdfType,
  setSelectedPdfType 
}: { 
  tradeType: 'TT' | 'TP';
  selectedPdfType: 'index' | 'syllabus';
  setSelectedPdfType: (type: 'index' | 'syllabus') => void;
}) {
  const pdfPath = `/api/curriculum-pdf?type=${selectedPdfType}&tradeType=${tradeType}`;

  return (
    <div className="space-y-6">
      {/* PDF Type Selector */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Syllabus Documents</h2>
        <div className="flex space-x-4">
          <button
            onClick={() => setSelectedPdfType('index')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              selectedPdfType === 'index'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Index
          </button>
          <button
            onClick={() => setSelectedPdfType('syllabus')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              selectedPdfType === 'syllabus'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Syllabus
          </button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {selectedPdfType === 'index' ? 'Course Index' : 'Course Syllabus'} - {tradeType}
          </h3>
        </div>
        <div className="relative" style={{ height: '800px' }}>
          <iframe
            src={pdfPath}
            className="w-full h-full"
            title={`${selectedPdfType} PDF`}
          />
        </div>
      </div>
    </div>
  );
}
