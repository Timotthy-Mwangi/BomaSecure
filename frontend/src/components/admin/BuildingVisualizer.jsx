import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';

const BuildingVisualizer = ({ apartment, onUnitClick, tenantPaymentStatus = {} }) => {
  const floorMap = useMemo(() => {
    const groups = {};
    apartment.units.forEach(unit => {
      const floor = unit.floor != null ? unit.floor : 1;
      if (!groups[floor]) groups[floor] = [];
      groups[floor].push(unit);
    });
    return Object.entries(groups).sort((a, b) => a[0] - b[0]);
  }, [apartment.units]);

  const getUnitColor = (unit) => {
    if (!unit.isOccupied || !unit.tenantId) {
      return {
        border: '#10B981',
        bg: 'rgba(16, 185, 129, 0.15)',
        color: '#34D399',
        label: 'Vacant'
      };
    }

    const tenantId = unit.tenantId._id || unit.tenantId;
    const status = tenantPaymentStatus[tenantId];

    if (status === 'paid') {
      return {
        border: '#3B82F6',
        bg: 'rgba(59, 130, 246, 0.15)',
        color: '#60A5FA',
        label: 'Paid'
      };
    } else if (status === 'overdue') {
      return {
        border: '#EF4444',
        bg: 'rgba(239, 68, 68, 0.15)',
        color: '#F87171',
        label: 'Overdue'
      };
    } else if (status === 'partial') {
      return {
        border: '#F59E0B',
        bg: 'rgba(245, 158, 11, 0.15)',
        color: '#FBBF24',
        label: 'Partial'
      };
    } else {
      return {
        border: '#64748B',
        bg: 'rgba(100, 116, 139, 0.15)',
        color: '#94A3B8',
        label: 'Pending'
      };
    }
  };

  if (!apartment || !apartment.units) return null;

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      backgroundColor: '#0F172A',
      borderRadius: '16px',
      overflow: 'visible',
      minHeight: '500px',
      marginBottom: '24px',
      userSelect: 'none'
    },
    header: { marginBottom: '32px', textAlign: 'center' },
    title: { fontSize: '20px', fontWeight: 'bold', color: '#fff', margin: 0 },
    subtitle: { color: '#94A3B8', fontSize: '14px', marginTop: '4px' },
    scene: {
      position: 'relative',
      perspective: '1200px',
      transformStyle: 'preserve-3d',
      pointerEvents: 'none'
    },
    buildingStack: {
      transformStyle: 'preserve-3d',
      transform: 'rotateX(45deg) rotateZ(-45deg)',
      display: 'flex',
      flexDirection: 'column-reverse',
      gap: '8px',
      pointerEvents: 'none'
    },
    floor: (fIdx) => ({
      position: 'relative',
      border: '2px solid #334155',
      backgroundColor: 'rgba(30, 41, 59, 0.5)',
      padding: '8px',
      transform: `translateZ(${fIdx * 40}px)`,
      minWidth: '220px',
      transformStyle: 'preserve-3d',
      boxShadow: '5px 5px 15px rgba(0,0,0,0.5)',
      transition: 'background-color 0.2s',
      pointerEvents: 'none'
    }),
    floorLabel: {
      position: 'absolute',
      left: '-70px',
      top: '0',
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#64748B'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '8px',
      transformStyle: 'preserve-3d',
      pointerEvents: 'auto'
    },
    unit: (colors) => ({
      position: 'relative',
      height: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '4px',
      border: `1px solid ${colors.border}`,
      backgroundColor: colors.bg,
      color: colors.color,
      transform: 'translateZ(10px)',
      cursor: 'pointer',
      fontSize: '10px',
      fontWeight: 'bold',
      pointerEvents: 'auto'
    }),
    legend: { display: 'flex', gap: '24px', marginTop: '48px', flexWrap: 'wrap', justifyContent: 'center' },
    legendItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#CBD5E1' },
    legendBox: (color) => ({ width: '12px', height: '12px', backgroundColor: color, borderRadius: '3px' })
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>{apartment.buildingName}</h3>
        <p style={styles.subtitle}>3D Structural View ({floorMap.length} Floors)</p>
      </div>

      <div style={styles.scene}>
        <motion.div 
          initial={{ rotateY: -15, rotateX: 25 }}
          whileHover={{ rotateY: 0, rotateX: 15 }}
          transition={{ duration: 0.5 }}
          style={styles.buildingStack}
        >
          {floorMap.map(([floorNumber, units], fIdx) => (
            <div 
              key={floorNumber}
              style={styles.floor(fIdx)}
            >
              <div style={styles.floorLabel}>
                FL {floorNumber}
              </div>

              <div style={styles.grid}>
                {units.map((unit) => {
                  const colors = getUnitColor(unit);
                  const rentDisplay = unit.rent ? `KES ${unit.rent.toLocaleString()}` : 'No rent set';
                  const dueDayDisplay = unit.rentDueDay ? `Due: Day ${unit.rentDueDay}` : '';
                  return (
                    <motion.div
                      key={unit._id || unit.number}
                      whileHover={{ scale: 1.1, translateZ: 30, backgroundColor: colors.bg.replace('0.15', '0.4') }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => { if (onUnitClick) onUnitClick(unit); }}
                      style={styles.unit(colors)}
                      title={`Unit ${unit.number} - ${colors.label}\nRent: ${rentDisplay}${dueDayDisplay ? '\n' + dueDayDisplay : ''} (Click to manage)`}
                    >
                      <span>{unit.number}</span>
                      {unit.isOccupied && <User size={10} style={{ position: 'absolute', top: 4, right: 4 }} />}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <div style={styles.legendBox('#10B981')} />
          <span>Vacant</span>
        </div>
        <div style={styles.legendItem}>
          <div style={styles.legendBox('#3B82F6')} />
          <span>Paid</span>
        </div>
        <div style={styles.legendItem}>
          <div style={styles.legendBox('#F59E0B')} />
          <span>Partial</span>
        </div>
        <div style={styles.legendItem}>
          <div style={styles.legendBox('#EF4444')} />
          <span>Overdue</span>
        </div>
        <div style={styles.legendItem}>
          <div style={styles.legendBox('#64748B')} />
          <span>Pending</span>
        </div>
      </div>
    </div>
  );
};

export default BuildingVisualizer;
