package campaign_test

import (
	"meye-core/internal/domain/campaign"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSupernaturalStats_GetRequiredXP(t *testing.T) {
	tests := []struct {
		name              string
		supernaturalStats *campaign.SupernaturalStats
		want              int
	}{
		{
			name: "Works correcly for single-skill/single-transformation",
			supernaturalStats: campaign.CreateSupernaturalStatsWithoutValidation(
				[]campaign.Skill{
					campaign.CreateSkillWithoutValidation([]uint{210}),
				},
			),
			want: 330,
		},
		{
			name: "Works correcly for single-skill/several-transformations",
			supernaturalStats: campaign.CreateSupernaturalStatsWithoutValidation(
				[]campaign.Skill{
					campaign.CreateSkillWithoutValidation([]uint{210, 110}),
				},
			),
			want: 680,
		},
		{
			name: "Works correcly for several-skills/several-transformations",
			supernaturalStats: campaign.CreateSupernaturalStatsWithoutValidation(
				[]campaign.Skill{
					campaign.CreateSkillWithoutValidation([]uint{220, 230}),
					campaign.CreateSkillWithoutValidation([]uint{110, 330}),
				},
			),
			want: 2450,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got := test.supernaturalStats.GetRequiredXP()

			assert.Equal(t, test.want, got)
		})
	}
}
