import json
from typing import List, Literal, Mapping

Movie = Mapping[Literal["name", "year", "rating", "director", "stars"], str]


class Stat:
    number_of_movie: int = 0
    rating_sum: float = 0

    def add_rating(self, r: float):
        self.number_of_movie = self.number_of_movie + 1
        self.rating_sum = self.rating_sum + r


file = open("data.json", "r")
data: List[Movie] = json.load(file)

star_name_to_stat: Mapping[str, Stat] = {}
for movie in data:
    for star in movie["stars"].split(", "):
        if star not in star_name_to_stat:
            star_name_to_stat[star] = Stat()
        star_name_to_stat[star].add_rating(float(movie["rating"]))

for [star_name, stat] in sorted(star_name_to_stat.items(), key=lambda k: k[1].number_of_movie):
    if stat.number_of_movie == 1:
        continue
    star_name_output = "{0:25}".format(f"'{star_name}'") 
    movies_output = stat.number_of_movie
    avg_rating_output = f"{stat.rating_sum/stat.number_of_movie:.2f}"
    print(f"Star Name: {star_name_output} | Movies:  {movies_output} | AVG Rating: {avg_rating_output}")
