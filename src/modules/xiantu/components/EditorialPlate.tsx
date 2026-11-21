import type { EditorialPlateId } from '../types';

interface EditorialPlateProps {
  plateId: EditorialPlateId;
  alt: string;
  className?: string;
}

/**
 * Architectural ink-and-celadon monograph vector plates crafted specifically
 * for Chapter 3 (Clean Code, Decomposition, Naming & Deterministic Evaluation).
 */
export function EditorialPlate({ plateId, alt, className = '' }: EditorialPlateProps) {
  return (
    <div
      role="img"
      aria-label={alt}
      className={`w-full h-full bg-[#ECEFEB] flex items-center justify-center overflow-hidden ${className}`}
    >
      {plateId === 'ch3-hero-codecraft' && (
        <svg viewBox="0 0 800 450" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="ch3-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F5F6F2" />
              <stop offset="100%" stopColor="#E3EAE6" />
            </linearGradient>
            <linearGradient id="ch3-jade" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1E6B52" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#1E6B52" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <rect width="800" height="450" fill="url(#ch3-sky)" />
          {/* Classical book grid rules */}
          <g stroke="#141918" strokeOpacity="0.08" strokeWidth="1">
            <line x1="64" y1="54" x2="736" y2="54" />
            <line x1="64" y1="60" x2="736" y2="60" />
            <line x1="64" y1="396" x2="736" y2="396" />
            <line x1="64" y1="54" x2="64" y2="396" />
            <line x1="736" y1="54" x2="736" y2="396" />
            <line x1="288" y1="60" x2="288" y2="396" />
            <line x1="512" y1="60" x2="512" y2="396" />
          </g>
          {/* Mountain & architectural harmony arcs */}
          <path
            d="M64 352 Q210 245 340 292 T620 220 Q690 200 736 238 L736 396 L64 396 Z"
            fill="url(#ch3-jade)"
          />
          <path
            d="M64 352 Q210 245 340 292 T620 220 Q690 200 736 238"
            fill="none"
            stroke="#1E6B52"
            strokeOpacity="0.35"
            strokeWidth="1.5"
          />
          {/* Balanced code-rhythm bamboo slips */}
          <g transform="translate(118, 108)">
            <rect x="0" y="0" width="128" height="10" rx="2" fill="#141918" fillOpacity="0.72" />
            <rect x="0" y="22" width="96" height="7" rx="2" fill="#1E6B52" fillOpacity="0.55" />
            <rect x="18" y="38" width="110" height="7" rx="2" fill="#141918" fillOpacity="0.35" />
            <rect x="18" y="54" width="84" height="7" rx="2" fill="#141918" fillOpacity="0.35" />
            <rect x="0" y="70" width="60" height="7" rx="2" fill="#1E6B52" fillOpacity="0.55" />
          </g>
          {/* Central Carpenter Square & Compass (规矩方圆) */}
          <g transform="translate(400, 198)">
            <circle cx="0" cy="0" r="88" fill="none" stroke="#1E6B52" strokeWidth="1.5" strokeOpacity="0.65" />
            <circle cx="0" cy="0" r="76" fill="none" stroke="#141918" strokeWidth="0.75" strokeDasharray="4 4" strokeOpacity="0.35" />
            <rect x="-54" y="-54" width="108" height="108" fill="none" stroke="#141918" strokeWidth="1.4" strokeOpacity="0.7" />
            <line x1="-102" y1="0" x2="102" y2="0" stroke="#141918" strokeOpacity="0.18" strokeWidth="1" />
            <line x1="0" y1="-102" x2="0" y2="102" stroke="#141918" strokeOpacity="0.18" strokeWidth="1" />
            <rect x="-18" y="-18" width="36" height="36" fill="#B83B2A" fillOpacity="0.1" stroke="#B83B2A" strokeWidth="1.4" />
            <text
              x="0"
              y="5"
              textAnchor="middle"
              fill="#B83B2A"
              fontSize="16"
              fontFamily="Noto Serif SC, serif"
              fontWeight="600"
            >
              规矩
            </text>
          </g>
          {/* Right decomposed single-responsibility modules */}
          <g transform="translate(556, 114)">
            <rect x="0" y="0" width="132" height="44" rx="4" fill="#FFFFFF" fillOpacity="0.88" stroke="#1E6B52" strokeOpacity="0.45" />
            <rect x="14" y="13" width="68" height="6" rx="2" fill="#1E6B52" fillOpacity="0.7" />
            <rect x="14" y="26" width="96" height="5" rx="2" fill="#141918" fillOpacity="0.28" />

            <rect x="0" y="60" width="132" height="44" rx="4" fill="#FFFFFF" fillOpacity="0.88" stroke="#1E6B52" strokeOpacity="0.45" />
            <rect x="14" y="73" width="54" height="6" rx="2" fill="#1E6B52" fillOpacity="0.7" />
            <rect x="14" y="86" width="84" height="5" rx="2" fill="#141918" fillOpacity="0.28" />

            <rect x="0" y="120" width="132" height="44" rx="4" fill="#FFFFFF" fillOpacity="0.88" stroke="#1E6B52" strokeOpacity="0.45" />
            <rect x="14" y="133" width="76" height="6" rx="2" fill="#1E6B52" fillOpacity="0.7" />
            <rect x="14" y="146" width="90" height="5" rx="2" fill="#141918" fillOpacity="0.28" />
          </g>
        </svg>
      )}

      {plateId === 'ch3-art-selfdoc' && (
        <svg viewBox="0 0 400 300" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <rect width="400" height="300" fill="#EAEEEA" />
          <rect x="44" y="34" width="312" height="232" rx="4" fill="#FAFBF9" stroke="#141918" strokeOpacity="0.16" />
          <line x1="72" y1="68" x2="328" y2="68" stroke="#141918" strokeOpacity="0.12" />
          <line x1="72" y1="73" x2="328" y2="73" stroke="#141918" strokeOpacity="0.06" />
          {/* Clean spacious lines symbolizing self-documenting prose */}
          <rect x="72" y="96" width="142" height="9" rx="2" fill="#1E6B52" fillOpacity="0.85" />
          <rect x="72" y="120" width="218" height="7" rx="2" fill="#141918" fillOpacity="0.28" />
          <rect x="92" y="138" width="176" height="7" rx="2" fill="#141918" fillOpacity="0.48" />
          <rect x="72" y="166" width="112" height="9" rx="2" fill="#1E6B52" fillOpacity="0.85" />
          <rect x="92" y="186" width="190" height="7" rx="2" fill="#141918" fillOpacity="0.38" />
          <rect x="288" y="210" width="40" height="34" fill="#B83B2A" fillOpacity="0.08" stroke="#B83B2A" strokeWidth="1.2" />
          <text x="308" y="232" textAnchor="middle" fill="#B83B2A" fontSize="13" fontFamily="Noto Serif SC, serif">
            留白
          </text>
        </svg>
      )}

      {plateId === 'ch3-art-decompose' && (
        <svg viewBox="0 0 400 300" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <rect width="400" height="300" fill="#E8ECE9" />
          {/* Left monolith vs right cleanly split blocks */}
          <rect x="42" y="64" width="84" height="172" rx="4" fill="#141918" fillOpacity="0.18" stroke="#141918" strokeOpacity="0.28" strokeDasharray="4 3" />
          <g stroke="#1E6B52" strokeWidth="1.6" fill="none">
            <path d="M142 150 H208" />
            <path d="M200 144 L208 150 L200 156" />
          </g>
          <g transform="translate(226, 56)">
            <rect x="0" y="0" width="132" height="48" rx="4" fill="#FAFBF9" stroke="#1E6B52" strokeWidth="1.4" />
            <rect x="14" y="15" width="70" height="6" rx="2" fill="#1E6B52" />
            <rect x="14" y="29" width="96" height="5" rx="2" fill="#141918" fillOpacity="0.3" />

            <rect x="0" y="70" width="132" height="48" rx="4" fill="#FAFBF9" stroke="#1E6B52" strokeWidth="1.4" />
            <rect x="14" y="85" width="60" height="6" rx="2" fill="#1E6B52" />
            <rect x="14" y="99" width="86" height="5" rx="2" fill="#141918" fillOpacity="0.3" />

            <rect x="0" y="140" width="132" height="48" rx="4" fill="#FAFBF9" stroke="#1E6B52" strokeWidth="1.4" />
            <rect x="14" y="155" width="82" height="6" rx="2" fill="#1E6B52" />
            <rect x="14" y="169" width="92" height="5" rx="2" fill="#141918" fillOpacity="0.3" />
          </g>
        </svg>
      )}

      {plateId === 'ch3-art-naming' && (
        <svg viewBox="0 0 400 300" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <rect width="400" height="300" fill="#ECEFEB" />
          <circle cx="200" cy="150" r="96" fill="#FAFBF9" stroke="#141918" strokeOpacity="0.22" strokeWidth="1.5" />
          <circle cx="200" cy="150" r="82" fill="none" stroke="#1E6B52" strokeOpacity="0.45" strokeWidth="1.2" />
          <line x1="118" y1="150" x2="282" y2="150" stroke="#141918" strokeOpacity="0.14" />
          <text x="200" y="128" textAnchor="middle" fill="#1E6B52" fontSize="15" fontFamily="JetBrains Mono, monospace" fontWeight="600">
            m_name · isValid
          </text>
          <text x="200" y="182" textAnchor="middle" fill="#B83B2A" fontSize="14" fontFamily="JetBrains Mono, monospace" textDecoration="line-through">
            __var · _Name
          </text>
        </svg>
      )}

      {plateId === 'ch3-art-ruler' && (
        <svg viewBox="0 0 400 300" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <rect width="400" height="300" fill="#E9ECE9" />
          {/* Carpenter L-square ruler with precise tick marks */}
          <path
            d="M84 56 H320 V96 H124 V244 H84 Z"
            fill="#FAFBF9"
            stroke="#141918"
            strokeOpacity="0.65"
            strokeWidth="1.5"
          />
          <g stroke="#1E6B52" strokeWidth="1.2">
            {[140, 165, 190, 215, 240, 265, 290].map((x) => (
              <line key={x} x1={x} y1="56" x2={x} y2={x % 50 === 40 ? '74' : '67'} />
            ))}
            {[120, 145, 170, 195, 220].map((y) => (
              <line key={y} x1="84" y1={y} x2={y % 50 === 20 ? '102' : '95'} y2={y} />
            ))}
          </g>
          <rect x="174" y="138" width="136" height="82" rx="4" fill="#1E6B52" fillOpacity="0.08" stroke="#1E6B52" strokeOpacity="0.45" />
          <text x="242" y="174" textAnchor="middle" fill="#141918" fontSize="14" fontFamily="JetBrains Mono, monospace" fontWeight="600">
            {'if (ok) { }'}
          </text>
          <text x="242" y="198" textAnchor="middle" fill="#1E6B52" fontSize="12" fontFamily="JetBrains Mono, monospace">
            constexpr · const_cast
          </text>
        </svg>
      )}
    </div>
  );
}
