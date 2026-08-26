import IconAction from './IconAction';

interface IconActionExtendProps {
  iconPrimary: string;
  textPrimary: string;
  onClickPrimary: () => void;
  fontWeightPrimary: string;
  viewIconSecondary: boolean;
  iconSecondary?: string;
  onClickSecondary: () => void;
}

const IconActionExtend = ({
  fontWeightPrimary,
  iconPrimary,
  iconSecondary = 'icon_close',
  onClickPrimary,
  onClickSecondary,
  textPrimary,
  viewIconSecondary,
}: IconActionExtendProps) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
      }}
      className="no-select"
    >
      <IconAction
        icon={iconPrimary}
        text={textPrimary}
        position="none"
        onClick={onClickPrimary}
        fontWeight={fontWeightPrimary}
      />
      {viewIconSecondary && (
        <IconAction
          icon={iconSecondary}
          position="none"
          onClick={onClickSecondary}
          left={0.4}
        />
      )}
    </div>
  );
};

export default IconActionExtend;
