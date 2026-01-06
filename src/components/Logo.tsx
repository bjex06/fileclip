import React, { useState } from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, className = '' }) => {
  const [imageError, setImageError] = useState(false);

  const sizeConfig = {
    sm: { icon: 40, text: 'text-xl' },
    md: { icon: 48, text: 'text-2xl' },
    lg: { icon: 64, text: 'text-3xl' },
    xl: { icon: 120, text: 'text-5xl' }
  };

  const { icon, text } = sizeConfig[size];

  // SVGフォールバック（画像がない場合に表示）
  const FallbackSvg = () => (
    <svg
      width={icon}
      height={icon}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      {/* ファイルの背景 (Front Folder: #64D2C3) */}
      <rect x="12" y="8" width="40" height="48" rx="4" fill="#64D2C3" />

      {/* ファイルの折り返し部分 (Dark Blue: #4A90E2) */}
      <path d="M40 8L52 20H44C41.7909 20 40 18.2091 40 16V8Z" fill="#74B4E8" />

      {/* クリップ (Orange: #FFB85F) */}
      <path
        d="M28 4C25.7909 4 24 5.79086 24 8V28C24 32.4183 27.5817 36 32 36C36.4183 36 40 32.4183 40 28V12"
        stroke="#FFB85F"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M32 12V28C32 30.2091 33.7909 32 36 32"
        stroke="#FFB85F"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* ファイル内の線 (Text lines: White/Light Blue) */}
      <rect x="18" y="28" width="20" height="3" rx="1.5" fill="#E0F2FE" />
      <rect x="18" y="35" width="16" height="3" rx="1.5" fill="#E0F2FE" />
      <rect x="18" y="42" width="24" height="3" rx="1.5" fill="#E0F2FE" />
      <rect x="18" y="49" width="12" height="3" rx="1.5" fill="#E0F2FE" />
    </svg>
  );

  return (
    <div className={`flex items-center ${className}`}>
      {/* ロゴ画像（/public/logo.png があれば表示、なければSVGフォールバック） */}
      {!imageError ? (
        <img
          src="/logo.png?v=5"
          alt="File CLIP"
          width={icon}
          height={icon}
          className="flex-shrink-0 object-contain"
          onError={() => setImageError(true)}
        />
      ) : (
        <FallbackSvg />
      )}

      {showText && (
        <div className={`ml-2 font-bold ${text}`}>
          <span className="text-[#4A90E2]">File</span>
          <span className="text-[#FFB85F]"> CLIP</span>
        </div>
      )}
    </div>
  );
};

export default Logo;
