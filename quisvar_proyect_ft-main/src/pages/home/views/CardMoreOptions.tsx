import { useNavigate } from 'react-router-dom';
import './cardMoreOptions.css';
import { motion } from 'framer-motion';

const options = [
  {
    img: '/img/invoiceComputer.png',
    name: 'Factura personalizada',
    link: '/factura',
  },
  {
    img: '/img/food.svg',
    name: 'Comidas',
    link: '/cocina',
  },
  {
    img: '/svg/calendary-icon.svg',
    name: 'Rotaciones',
    link: '/rotaciones',
  },
  {
    img: '/svg/menu/control-puerta.svg',
    name: 'Control de puerta',
    link: '/control-puerta',
  },
  {
    img: '/svg/menu/metrado-estructuras.svg',
    name: 'Metrado de Estructuras',
    link: '/metrados',
  },
];

const CardMoreOptions = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      id="home-module-menu"
      className="cardMoreOptions"
      role="navigation"
      aria-label="Modulos de DHYRIUM SAA"
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <div className="cardMoreOptions-header">
        <span className="cardMoreOptions-eyebrow">Accesos rapidos</span>
        <h2 className="cardMoreOptions-title">DHYRIUM SAA</h2>
      </div>
      <div className="cardMoreOptions-items">
        {options.map(({ img, link, name }) => (
          <button
            className="cardMoreOptions-item"
            key={name}
            type="button"
            onClick={() => navigate(link)}
          >
            <figure className="cardMoreOptions-figure" aria-hidden="true">
              <img src={img} alt={name} />
            </figure>
            <span className="cardMoreOptions-name">{name}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default CardMoreOptions;
