package campaign

type CampaignBasicInfo struct {
	id       string
	name     string
	masterID string
}

func (c *CampaignBasicInfo) ID() string       { return c.id }
func (c *CampaignBasicInfo) Name() string     { return c.name }
func (c *CampaignBasicInfo) MasterID() string { return c.masterID }

func CreateCampaignBasicInfo(id, name, masterID string) *CampaignBasicInfo {
	return &CampaignBasicInfo{
		id:       id,
		name:     name,
		masterID: masterID,
	}
}
