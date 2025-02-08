import { Sequelize, DataTypes, ModelStatic, Model, Optional } from 'sequelize';
import 'dotenv/config'

// Initialize Sequelize
const sequelize = new Sequelize(process.env.DATABASE_URL!, {
  dialect: 'postgres', // Explicitly specify the dialect
  dialectOptions: {
    ssl: {
      require: true, // Use SSL for secure connections (required for CockroachDB)
      rejectUnauthorized: false, // Allow self-signed certificates
    },
  },
  logging: false, // Disable logging for cleaner output (optional)
});

// Define User Model
interface UserAttributes {
  userID: string;
  username: string;
  profilePic?: string;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'userID'> {}

const User: ModelStatic<Model<UserAttributes, UserCreationAttributes>> = sequelize.define(
  'User',
  {
    userID: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    profilePic: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: 'Users',
  }
);

// Define Post Model
interface PostAttributes {
  postID: string;
  imageURL: string;
  content: string;
  ownerID: string;
  createdAt: Date;
}

interface PostCreationAttributes extends Optional<PostAttributes, 'postID' | 'createdAt'> {}

const Post: ModelStatic<Model<PostAttributes, PostCreationAttributes>> = sequelize.define(
  'Post',
  {
    postID: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    imageURL: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    ownerID: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'Posts',
  }
);

// Define Timeline Model
interface TimelineAttributes {
  id: string;
  userID: string;
  postID: string;
  isLiked: boolean;
  isCommented: boolean;
}

interface TimelineCreationAttributes extends Optional<TimelineAttributes, 'id'> {}

const Timeline: ModelStatic<Model<TimelineAttributes, TimelineCreationAttributes>> = sequelize.define(
  'Timeline',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userID: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    postID: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isLiked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isCommented: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: 'Timelines',
  }
);

/* Define Relationships*/

// User has many Posts
User.hasMany(Post, { foreignKey: 'ownerID', onDelete: 'CASCADE' });
Post.belongsTo(User, { foreignKey: 'ownerID' });

// User has many Timeline entries
User.hasMany(Timeline, { foreignKey: 'userID', onDelete: 'CASCADE' });
Timeline.belongsTo(User, { foreignKey: 'userID' });

// Post has many Timeline entries
Post.hasMany(Timeline, { foreignKey: 'postID', onDelete: 'CASCADE' });
Timeline.belongsTo(Post, { foreignKey: 'postID' });

// Export models and sequelize instance
export { sequelize, User, Post, Timeline };