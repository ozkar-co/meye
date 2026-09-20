package campaign

const (
	levelStepSpecial   = 100
	energyDefaultCost  = 10
	energyTalentedCost = energyDefaultCost / 2
)

func (ss *SpecialStats) GetRequiredXP() uint {
	physicalGroup := ss.physical.getGroup()
	energyGroup := ss.energy.getGroup()
	mentalGroup := ss.mental.getGroup()

	physicalXP := getGroupRequiredXP(physicalGroup, levelStepSpecial, getSpecialFirstLevelCost(ss.physical.isTalented))
	energyXP := getGroupRequiredXP(energyGroup, levelStepSpecial, getSpecialFirstLevelCost(ss.energy.isTalented))
	mentalXP := getGroupRequiredXP(mentalGroup, levelStepSpecial, getSpecialFirstLevelCost(ss.mental.isTalented))

	energyCost := getEnergyTankCost(ss.isEnergyTalented)

	energyTankXP := energyCost * ss.energyTank

	return physicalXP + energyXP + mentalXP + energyTankXP
}

func (ps PhysicalSkills) getGroup() []uint {
	return []uint{ps.empowerment + ps.vitalControl}
}

func (ms MentalSkills) getGroup() []uint {
	return []uint{ms.mentalControl + ms.ilusion}
}

func (es EnergySkills) getGroup() []uint {
	return []uint{es.energyHandling + es.objectHandling}
}

func getSpecialFirstLevelCost(isTalented bool) uint {
	if isTalented {
		return 1
	}
	return 2
}

func getEnergyTankCost(isEnergyTalented bool) uint {
	if isEnergyTalented {
		return energyTalentedCost
	}

	return energyDefaultCost
}

func (ss SpecialStats) getOrderedStats() []uint {
	return []uint{
		ss.physical.empowerment,
		ss.physical.vitalControl,
		ss.energy.energyHandling,
		ss.energy.objectHandling,
		ss.mental.ilusion,
		ss.mental.mentalControl,
		ss.energyTank,
	}
}

func (ss SpecialStats) isHigherThan(ssB SpecialStats) bool {
	stats := ss.getOrderedStats()
	statsB := ssB.getOrderedStats()

	return isHigherThan(stats, statsB)
}
