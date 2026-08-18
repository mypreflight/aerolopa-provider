Feature: Listing the configuration index
  As the flight tracker backend
  I want the whole catalogue of cabin configurations
  So that I can resolve aircraft without asking for each one

  Scenario: Listing every published configuration
    Given AeroLOPA publishes the configurations "lh-32n, lo-7m8-1, aa-a321t"
    When I send a "GET" request to "/seatmap?op=configurations"
    Then the response status should be 200
    And the response body should contain:
      """
      {
        "count": 3,
        "configurations": [
          { "slug": "lh-32n", "airlineIata": "LH", "aircraftIata": "32N" },
          { "slug": "lo-7m8-1", "airlineIata": "LO", "aircraftIata": "7M8" },
          { "slug": "aa-a321t", "airlineIata": "AA", "aircraftIata": "A321T" }
        ]
      }
      """

  Scenario: Pages that are not configurations are left out of the index
    Given AeroLOPA publishes the configurations "lh-32n"
    When I send a "GET" request to "/seatmap?op=configurations"
    Then the response status should be 200
    And the response body should contain:
      """
      {
        "count": 1,
        "configurations": [
          { "slug": "lh-32n", "airlineIata": "LH", "aircraftIata": "32N" }
        ]
      }
      """
