package campaign_test

import (
	"meye-core/internal/domain/campaign"
	"meye-core/tests/data"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestBasicStats_GetRequiredXP(t *testing.T) {
	tests := []struct {
		name       string
		basicStats campaign.BasicStats
		want       int
	}{
		{
			name:       "Works correctly with physical talent",
			basicStats: data.BasicStatsWithPhysicalTalent(),
			want:       1176,
		},
		{
			name:       "Works correctly with mental talent",
			basicStats: data.BasicStatsWithMentalTalent(),
			want:       1096,
		},
		{
			name:       "Works correctly with coordination talent",
			basicStats: data.BasicStatsWithCoordinationTalent(),
			want:       1016,
		},
		{
			name:       "Works correctly with no talents",
			basicStats: data.BasicStatsWithNoTalents(),
			want:       1280,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got := test.basicStats.GetRequiredXP()

			assert.Equal(t, test.want, got)
		})
	}
}
