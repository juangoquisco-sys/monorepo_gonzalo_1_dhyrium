import { NavLink } from 'react-router-dom';
import './groupMeetingBar.css';
import type { Nav } from '../../types/types.request';
interface GroupOptions {
  itemOptions: Nav[];
}
const GroupMeetingBar = ({ itemOptions }: GroupOptions) => {
  return (
    <div className="gmb-content">
      {itemOptions &&
        itemOptions.map((item, index) => (
          <NavLink
            key={index}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `gmb-sidebar-data ${isActive ? 'contract-selected' : ''}`
            }
          >
            <figure className="gmb-sidebar-figure">
              {item.icon ? (
                <item.icon size={17} strokeWidth={2.2} />
              ) : (
                <img
                  src={item.imgSrc}
                  alt={item.imgAlt}
                  style={{ width: 18 }}
                />
              )}
            </figure>
            <div className="gmb-sidebar-copy">
              <h4 className="gmb-sidebar-name">{item.title}</h4>
              {item.description && (
                <span className="gmb-sidebar-description">
                  {item.description}
                </span>
              )}
            </div>
            {item.badge && (
              <span className="gmb-sidebar-badge">{item.badge}</span>
            )}
          </NavLink>
        ))}
    </div>
  );
};

export default GroupMeetingBar;
