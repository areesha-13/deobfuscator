import { Link } from 'react-router-dom'; // Ensure Link is imported

export default function Footer() { 
  return ( 
    <footer style={{ 
      padding: '32px 48px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      background: 'rgba(255,255,255,0.04)', 
      backdropFilter: 'blur(24px) saturate(1.4)', 
      WebkitBackdropFilter: 'blur(24px) saturate(1.4)', 
      borderTop: '1px solid rgba(255,255,255,0.08)', // Combined into a single property
      flexWrap: 'wrap', 
      gap: 16, 
    }}> 
      <span style={{ 
        fontFamily: "'Orbitron', sans-serif", 
        fontWeight: 900, 
        fontSize: '0.9rem', 
        color: '#FF0080', 
        letterSpacing: '0.08em', 
        opacity: 0.8 
      }}>
        REVERSOR
      </span> 
      
      <div style={{ display: 'flex', gap: 28 }}> 
        {[['/', 'Home'], ['/tool', 'Tool'], ['/about', 'About']].map(([path, label]) => ( 
          <Link 
            key={path} 
            to={path} 
            style={{ 
              fontFamily: "'Inter', sans-serif", 
              fontSize: '0.8rem', 
              color: 'rgba(255,255,255,0.35)', 
              textDecoration: 'none' 
            }}
          >
            {label}
          </Link> 
        ))} 
      </div> 
      
      <span style={{ 
        fontFamily: "'Inter', sans-serif", 
        fontSize: '0.75rem', 
        color: 'rgba(255,255,255,0.2)' 
      }}>
        Built for security research and analysis.
      </span> 
    </footer> 
  ) 
}
