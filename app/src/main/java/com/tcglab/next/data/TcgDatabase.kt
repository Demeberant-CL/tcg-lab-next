package com.tcglab.next.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "collection_cards")
data class CollectionCardEntity(
    @PrimaryKey val key: String,
    val name: String,
    val setCode: String,
    val number: String,
    val quantity: Int,
    val imageUrl: String = "",
    val category: String = "Pokémon"
)

@Dao
interface CollectionDao {
    @Query("SELECT * FROM collection_cards ORDER BY name")
    fun observeAll(): Flow<List<CollectionCardEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(card: CollectionCardEntity)

    @Query("DELETE FROM collection_cards WHERE key = :key")
    suspend fun delete(key: String)
}

@Database(entities = [CollectionCardEntity::class], version = 1, exportSchema = false)
abstract class TcgDatabase : RoomDatabase() {
    abstract fun collectionDao(): CollectionDao
}
