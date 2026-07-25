export function SocialLinks({ className = "" }) {
  return (
    <div className={`flex gap-3 ${className}`}>
      <a href="https://instagram.com/mietgate" target="_blank" rel="noopener noreferrer" className="group" title="Instagram">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <defs>
            <linearGradient id="insta-grad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#feda75" />
              <stop offset="5%" stopColor="#fa7e1e" />
              <stop offset="45%" stopColor="#d92e7f" />
              <stop offset="60%" stopColor="#9b36b7" />
              <stop offset="90%" stopColor="#515bd4" />
            </linearGradient>
          </defs>
          <rect width="24" height="24" rx="5" fill="url(#insta-grad)" />
          <circle cx="12" cy="12" r="3.5" fill="white" />
          <circle cx="18.5" cy="5.5" r="1" fill="white" />
          <path d="M 6 2 C 3.8 2 2 3.8 2 6 L 2 18 C 2 20.2 3.8 22 6 22 L 18 22 C 20.2 22 22 20.2 22 18 L 22 6 C 22 3.8 20.2 2 18 2 L 6 2 Z" fill="none" stroke="white" strokeWidth="1.5" opacity="0" className="group-hover:opacity-100 transition-opacity" />
        </svg>
      </a>
      <a href="https://facebook.com/mietgate" target="_blank" rel="noopener noreferrer" className="group" title="Facebook">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
          <path d="M 24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </a>
      <a href="https://tiktok.com/@mietgate" target="_blank" rel="noopener noreferrer" className="group" title="TikTok">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path fill="#25F4EE" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.1 1.75 2.9 2.9 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-.54-.05z" />
          <path fill="#25F4EE" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.1 1.75 2.9 2.9 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-.54-.05z" />
          <path fill="#121212" d="M9.75 15.02a2.61 2.61 0 1 1 0-5.22 2.61 2.61 0 0 1 0 5.22z" />
        </svg>
      </a>
    </div>
  );
}
