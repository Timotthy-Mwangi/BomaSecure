import React from 'react';
import { motion } from 'framer-motion';
import { COLORS, APP_NAME } from '../../config';
import logo from "../../assets/bomasecure.png";

const LoadingSpinner = ({ size = 'medium', fullScreen = false }) => {
  const sizes = {
    small: { width: '30px', height: '3px' },
    medium: { width: '50px', height: '4px' },
    large: { width: '80px', height: '6px' }
  };

  const containerStyle = fullScreen ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: COLORS.white,
    gap: '24px',
    zIndex: 9999
  } : {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    gap: '24px'
  };

  const loaderStyle = {
    width: sizes[size].width,
    height: sizes[size].height,
    background: COLORS.gray[200],
    borderRadius: sizes[size].height,
    overflow: 'hidden'
  };

  const barStyle = {
    width: '100%',
    height: '100%',
    background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.secondary})`,
    borderRadius: sizes[size].height,
  };

  return (
    <div style={containerStyle}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <img 
          src={logo} 
          alt="BomaSecure Logo" 
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '16px',
            objectFit: 'contain'
          }}
        />
        <span style={{
          fontFamily: 'Poppins, sans-serif',
          fontWeight: 700,
          fontSize: '32px',
          color: COLORS.dark
        }}>
          {APP_NAME}
        </span>
      </div>

      <div style={loaderStyle}>
        <motion.div
          style={barStyle}
          animate={{
            x: [0, parseInt(sizes[size].width), 0],
            opacity: [1, 0.5, 1]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      </div>

      <p style={{
        color: COLORS.gray[500],
        fontSize: '14px',
        margin: 0
      }}>
        Loading...
      </p>
    </div>
  );
};

export default LoadingSpinner;
