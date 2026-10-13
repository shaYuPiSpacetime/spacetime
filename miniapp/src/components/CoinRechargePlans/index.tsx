import { Image, View } from '@tarojs/components'
import { miniappOssIcons } from '@/constants/ossIcons'
import type { CoinPackage } from '@/types/coin'
import './index.scss'

interface CoinRechargePlansProps {
  packages: CoinPackage[]
  selected: CoinPackage | null
  onSelect: (pkg: CoinPackage) => void
  onNotice: () => void
}

/** 两个充值入口共用三列套餐布局，选中套餐不会横移或裁切首档。 */
export default function CoinRechargePlans({ packages, selected, onSelect, onNotice }: CoinRechargePlansProps) {
  return (
    <View className="coin-recharge-plans">
      <View className="coin-recharge-plans__header">
        <View className="coin-recharge-plans__title">充值千寻币</View>
        <View className="coin-recharge-plans__notice" onClick={onNotice}>充值须知 ›</View>
      </View>
      <View className="coin-recharge-plans__grid" style={{ gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, packages.length))}, minmax(0, 1fr))` }}>
        {packages.map(pkg => (
          <View key={pkg.id} className={`coin-recharge-plan${selected?.id === pkg.id ? ' coin-recharge-plan--selected' : ''}`} onClick={() => onSelect(pkg)}>
            {pkg.tag ? <View className="coin-recharge-plan__tag">{pkg.tag}</View> : null}
            <View className="coin-recharge-plan__amount"><Image src={miniappOssIcons.coinGold} mode="aspectFit" className="coin-recharge-plan__icon" /><View>{pkg.amount}</View></View>
            {pkg.originalPrice && pkg.discountLabel ? (
              <View className="coin-recharge-plan__discount"><View className="coin-recharge-plan__original">{pkg.originalPrice}</View><View className="coin-recharge-plan__discount-label">{pkg.discountLabel}</View></View>
            ) : <View className="coin-recharge-plan__description">{pkg.label}</View>}
            <View className="coin-recharge-plan__price">¥{Number(pkg.price).toFixed(2)}</View>
          </View>
        ))}
      </View>
    </View>
  )
}
