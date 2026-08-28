import { Outlet, useOutletContext } from 'react-router-dom';

export type UsersDirectoryView = 'table' | 'split';

export type UsersDirectoryOutletContext = {
  view: UsersDirectoryView;
};

const UsersDirectory = () => {
  const { view } = useOutletContext<UsersDirectoryOutletContext>();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        <Outlet context={{ view } satisfies UsersDirectoryOutletContext} />
      </div>
    </div>
  );
};

export default UsersDirectory;
