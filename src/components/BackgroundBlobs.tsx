import React from 'react';
import './BackgroundBlobs.css';

const BackgroundBlobs: React.FC = () => {
  return (
    <div className="background-blobs">
      <svg className="blob-svg" width="1280" height="832" viewBox="0 0 1280 832" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g filter="url(#filter0_f_75_536)">
          <path fillRule="evenodd" clipRule="evenodd" d="M1139.58 398.363C1231.11 389.395 1332.26 424.834 1384.54 500.492C1432.81 570.34 1379.94 660.551 1379.44 745.451C1378.94 829.342 1444.8 932.29 1381.67 987.538C1317.99 1043.27 1223.69 964.692 1139.58 955.362C1072.63 947.934 995.156 985.092 945.842 939.193C896.043 892.841 915.353 813.472 914.061 745.451C912.727 675.224 900.072 603.109 938.342 544.21C985.265 471.993 1053.87 406.76 1139.58 398.363Z" fill="#FCC0B9"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M724.348 -165.635C807.708 -173.804 906.007 -195.064 964.075 -134.7C1021.88 -74.6117 1005.37 24.248 984.718 105.027C968.847 167.095 913.15 203.274 866.441 247.121C822.203 288.649 783.237 334.827 724.348 349.444C644.951 369.152 551.918 392.534 488.423 340.952C422.611 287.486 415.879 189.479 423.486 105.027C430.409 28.177 470.051 -40.2989 527.415 -91.9051C581.587 -140.639 651.828 -158.527 724.348 -165.635Z" fill="#FCC0B9"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M279.602 562.252C343.855 565.531 400.553 602.345 442.712 650.944C481.822 696.028 494.041 754.503 498.04 814.054C502.434 879.499 512.801 954.492 466.194 1000.65C419.672 1046.72 344.646 1022.88 279.602 1030.37C198.395 1039.72 111.37 1096.15 44.4596 1049.2C-25.3859 1000.18 -39.7242 898.659 -28.6378 814.054C-18.6804 738.064 39.5926 681.882 98.9449 633.397C151.05 590.832 212.408 558.822 279.602 562.252Z" fill="#FCC0B9"/>
        </g>
        <defs>
          <filter id="filter0_f_75_536" x="-182" y="-326" width="1741.06" height="1543.63" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix"/>
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
            <feGaussianBlur stdDeviation="75" result="effect1_foregroundBlur_75_536"/>
          </filter>
        </defs>
      </svg>
    </div>
  );
};

export default BackgroundBlobs;

