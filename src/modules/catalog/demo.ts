import international from "./data/international.demo.json";
import data from "./data/italy.demo.json";
import type { EditorialCatalog } from "./model";

/** Public, independently sourced sample. Never a production catalog or personal data. */
export const italyDemo = ({...data,cities:[...data.cities,...international.cities],places:[...data.places,...international.places]}) as EditorialCatalog;
