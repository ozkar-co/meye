package campaign

type PjBasicInfo struct {
	id   string
	name string
}

func (p *PjBasicInfo) ID() string   { return p.id }
func (p *PjBasicInfo) Name() string { return p.name }

func CreatePjBasicInfo(id, name string) *PjBasicInfo {
	return &PjBasicInfo{
		id:   id,
		name: name,
	}
}
