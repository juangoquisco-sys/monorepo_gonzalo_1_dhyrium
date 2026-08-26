import './specialities.css';
import { Outlet } from 'react-router-dom';
import useHideElement from '@/hooks/useHideElement';
import { useEffect, useMemo, useState } from 'react';
import ResizableIcon from '@/components/resizableIcon/ResizableIcon';
import SidebarSpecility from './components/sidebarSpeciality/SidebarSpecility';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { SpecialityPanelLayoutContext } from './contexts/SpecialityPanelLayoutContext';

export const Specialities = () => {
  const { handleHideElements, hideElements } = useHideElement(1000);
  const [sidebarPanelVisible, setSidebarPanelVisible] = useState(true);
  const panelLayoutContext = useMemo(
    () => ({ sidebarPanelVisible, setSidebarPanelVisible }),
    [sidebarPanelVisible]
  );

  // const handleFilterForYear = async (e: FocusEvent<HTMLSelectElement>) => {
  //   const { data } = await axiosInstance.get<SectorType[]>('/sector');
  //   const { value } = e.target;
  //   const filterForYear = data
  //     .map(sector => {
  //       const specialitiesFilter = sector.specialities.filter(spaciality => {
  //         const year = new Date(spaciality.createdAt).getFullYear();
  //         return year === +value;
  //       });
  //       return {
  //         ...sector,
  //         specialities: specialitiesFilter,
  //       };
  //     })
  //     .filter(sector => sector.specialities.length);
  //   settingSectors(filterForYear);
  // };

  useEffect(() => {
    const cleanupLocalStorage = () => {
      localStorage.removeItem('arrCheckedLevel');
    };
    return () => {
      cleanupLocalStorage();
    };
  }, []);

  return (
    <SpecialityPanelLayoutContext.Provider value={panelLayoutContext}>
      <div className="speciality-main">
        <PanelGroup direction="horizontal">
          {sidebarPanelVisible && (
            <Panel
              defaultSize={20}
              order={1}
              className={`sidebarSpeciality-resizable ${
                hideElements && 'sidebar-hidden'
              }`}
            >
              <SidebarSpecility />
            </Panel>
          )}
          {sidebarPanelVisible && !hideElements && <PanelResizeHandle />}

          {sidebarPanelVisible && (
            <ResizableIcon
              handleHideElements={handleHideElements}
              hideElements={hideElements}
            />
          )}
          <Panel defaultSize={sidebarPanelVisible ? 80 : 100} order={2}>
            <Outlet />
          </Panel>
        </PanelGroup>
      </div>
    </SpecialityPanelLayoutContext.Provider>
  );
};
